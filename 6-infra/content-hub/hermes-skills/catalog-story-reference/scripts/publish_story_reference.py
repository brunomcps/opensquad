#!/usr/bin/env python3
"""Validate and publish complete story-reference dossiers."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sys
import tempfile
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
}
CANONICAL_KEY = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RECEIPT_DIR = Path(
    os.environ.get(
        "HERMES_STORY_RECEIPT_DIR",
        str(Path.home() / ".hermes/state/story-reference-publications"),
    )
)


class PublishError(RuntimeError):
    pass


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise PublishError(message)


def _nonempty_list(value: Any, label: str) -> list[Any]:
    _require(isinstance(value, list) and bool(value), f"{label} is required.")
    return value


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", ascii_value))


def _mime_type(path: Path, declared: str | None) -> str:
    mime = declared or mimetypes.guess_type(path.name)[0]
    _require(mime in ALLOWED_MIME_TYPES, f"Unsupported MIME type for {path.name}.")
    return str(mime)


def _validate_dossier(payload: dict[str, Any]) -> None:
    template = payload.get("template")
    reference = payload.get("reference")
    _require(isinstance(template, dict), "template is required.")
    _require(isinstance(reference, dict), "reference is required.")
    _require(CANONICAL_KEY.fullmatch(str(template.get("canonicalKey", ""))) is not None,
             "template.canonicalKey must use lowercase letters, numbers, and hyphens.")

    definition = template.get("definition")
    _require(isinstance(definition, dict), "template.definition is required.")
    for key in ("moldSteps", "preserveRules", "adaptRules", "avoidRules", "steps"):
        _nonempty_list(definition.get(key), f"template.definition.{key}")

    items = _nonempty_list(reference.get("items"), "reference.items")
    orders = [item.get("narrativeOrder") for item in items if isinstance(item, dict)]
    _require(orders == list(range(1, len(items) + 1)),
             "reference.items must have continuous narrativeOrder starting at 1.")
    for order, item in enumerate(items, 1):
        _require(isinstance(item, dict), f"Story {order} is invalid.")
        metadata = item.get("metadata")
        _require(isinstance(metadata, dict), f"Story {order} metadata is required.")
        for layer in ("quick", "visual", "deep"):
            _require(isinstance(metadata.get(layer), dict), f"Story {order} layer {layer} is required.")
        visual = metadata["visual"]
        for field in ("roleLabel", "title", "scene", "typography", "composition", "impression"):
            _require(bool(str(visual.get(field, "")).strip()),
                     f"Story {order} visual.{field} is required.")
        _nonempty_list(visual.get("palette"), f"Story {order} visual.palette")
        titles = [
            str(metadata[layer].get("title", "")).strip().casefold()
            for layer in ("quick", "visual", "deep")
        ]
        _require(all(titles) and len(set(titles)) == 3,
                 f"Story {order} quick, visual, and deep titles must be distinct.")

    analysis = reference.get("analysis")
    _require(isinstance(analysis, dict), "reference.analysis is required.")
    _require(bool(str(analysis.get("summary", "")).strip()), "reference.analysis.summary is required.")
    for key in ("overview", "sequenceMap", "transferRules", "synthesis"):
        _nonempty_list(analysis.get(key), f"reference.analysis.{key}")
    for key in ("visualGrammar", "productRevealed"):
        _require(bool(str(analysis.get(key, "")).strip()), f"reference.analysis.{key} is required.")
    registered = analysis.get("registeredTemplate")
    _require(isinstance(registered, dict) and bool(str(registered.get("name", "")).strip()),
             "reference.analysis.registeredTemplate is required.")
    _nonempty_list(registered.get("steps"), "reference.analysis.registeredTemplate.steps")


def prepare_payload(raw: dict[str, Any], payload_path: Path) -> tuple[dict[str, Any], dict[int, Path]]:
    _validate_dossier(raw)
    reference = raw["reference"]
    item_orders = {
        int(item["narrativeOrder"])
        for item in reference["items"]
        if item.get("mediaType") != "text"
    }
    raw_assets = raw.get("assets")
    _require(isinstance(raw_assets, list), "assets manifest is required.")

    local_files: dict[int, Path] = {}
    assets: list[dict[str, Any]] = []
    for asset in raw_assets:
        _require(isinstance(asset, dict), "Asset entry is invalid.")
        order = int(asset.get("narrativeOrder", 0))
        _require(order in item_orders and order not in local_files,
                 "Each visual story needs exactly one asset.")
        local_value = asset.get("localPath")
        _require(isinstance(local_value, str) and bool(local_value.strip()),
                 f"Asset {order} localPath is required.")
        local_path = Path(local_value).expanduser()
        if not local_path.is_absolute():
            local_path = (payload_path.parent / local_path).resolve()
        _require(local_path.is_file(), f"Asset {order} was not found: {local_path}")
        size = local_path.stat().st_size
        _require(0 < size <= 20 * 1024 * 1024, f"Asset {order} exceeds 20 MiB or is empty.")
        mime = _mime_type(local_path, asset.get("mimeType"))
        local_files[order] = local_path
        assets.append({
            "narrativeOrder": order,
            "fileName": str(asset.get("fileName") or local_path.name),
            "sha256": sha256_file(local_path),
            "mimeType": mime,
            "sizeBytes": size,
        })
    assets.sort(key=lambda entry: entry["narrativeOrder"])
    _require(set(local_files) == item_orders, "Asset manifest does not match visual stories.")
    _require(sum(asset["sizeBytes"] for asset in assets) <= 200 * 1024 * 1024,
             "Assets exceed 200 MiB in total.")

    payload = {
        "template": raw["template"],
        "reference": raw["reference"],
        "assets": assets,
    }
    reference_key = raw.get("referenceKey")
    if not reference_key:
        identity = {
            "platform": reference.get("platform"),
            "sourceAccount": reference.get("sourceAccount"),
            "sourceUrl": reference.get("sourceUrl"),
            "sourceStartedAt": reference.get("sourceStartedAt"),
            "sourceEndedAt": reference.get("sourceEndedAt"),
            "assetHashes": [asset["sha256"] for asset in assets],
        }
        prefix = "-".join(filter(None, [
            _slug(str(reference.get("platform") or "story")),
            _slug(str(reference.get("sourceAccount") or "source")),
        ]))
        reference_key = f"{prefix}-{hashlib.sha256(canonical_json(identity)).hexdigest()[:20]}"
    _require(CANONICAL_KEY.fullmatch(str(reference_key)) is not None,
             "referenceKey must use lowercase letters, numbers, and hyphens.")
    payload["referenceKey"] = str(reference_key)

    hash_input = {
        "template": payload["template"],
        "reference": payload["reference"],
        "assets": payload["assets"],
    }
    payload["contentHash"] = hashlib.sha256(canonical_json(hash_input)).hexdigest()
    return payload, local_files


def canonical_signature(
    method: str,
    path: str,
    timestamp: str,
    nonce: str,
    body: bytes,
    secret: str,
) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    canonical = "\n".join((method.upper(), path, timestamp, nonce, body_hash))
    return hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).hexdigest()


def signed_headers(
    endpoint: str,
    body: bytes,
    key_id: str,
    secret: str,
    timestamp: str | None = None,
    nonce: str | None = None,
) -> dict[str, str]:
    parsed = urlparse(endpoint)
    timestamp = timestamp or str(int(time.time() * 1000))
    nonce = nonce or secrets.token_urlsafe(24)
    return {
        "content-type": "application/json",
        "x-ci-agent-key": key_id,
        "x-ci-agent-timestamp": timestamp,
        "x-ci-agent-nonce": nonce,
        "x-ci-agent-signature": canonical_signature(
            "POST", parsed.path, timestamp, nonce, body, secret
        ),
    }


def _request_bytes(
    url: str,
    method: str,
    body: bytes,
    headers: dict[str, str],
    retries: int,
) -> bytes:
    for attempt in range(retries + 1):
        try:
            with urlopen(Request(url, data=body, headers=headers, method=method), timeout=30) as response:
                return response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            raise PublishError(f"HTTP {error.code}: {detail[:500]}") from None
        except URLError as error:
            if attempt >= retries:
                raise PublishError(f"Network request failed: {error.reason}") from None
            time.sleep(0.25 * (2 ** attempt))
    raise PublishError("Network request failed.")


def _post_json(
    endpoint: str,
    value: dict[str, Any],
    key_id: str,
    secret: str,
    idempotent: bool,
) -> dict[str, Any]:
    body = canonical_json(value)
    raw = _request_bytes(
        endpoint,
        "POST",
        body,
        signed_headers(endpoint, body, key_id, secret),
        retries=2 if idempotent else 0,
    )
    try:
        response = json.loads(raw)
    except json.JSONDecodeError:
        raise PublishError("Endpoint returned invalid JSON.") from None
    _require(isinstance(response, dict), "Endpoint returned an invalid response.")
    if response.get("ok") is False:
        error = response.get("error") or {}
        raise PublishError(f"{error.get('code', 'publish_failed')}: {error.get('message', 'Publication failed.')}")
    return response


def _receipt_path(reference_key: str) -> Path:
    return RECEIPT_DIR / f"{reference_key}.json"


def _read_receipt(reference_key: str, content_hash: str) -> dict[str, Any] | None:
    path = _receipt_path(reference_key)
    if not path.is_file():
        return None
    try:
        receipt = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return receipt if receipt.get("contentHash") == content_hash else None


def _write_receipt(result: dict[str, Any]) -> dict[str, Any]:
    receipt = {
        "referenceKey": result["referenceKey"],
        "referenceId": result["referenceId"],
        "templateId": result["templateId"],
        "contentHash": result["contentHash"],
        "revision": result["revision"],
        "link": result["link"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(prefix=".receipt-", dir=RECEIPT_DIR)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as temporary:
            json.dump(receipt, temporary, ensure_ascii=False, sort_keys=True, indent=2)
            temporary.write("\n")
        os.replace(temporary_name, _receipt_path(result["referenceKey"]))
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return receipt


def publish(payload: dict[str, Any], local_files: dict[int, Path]) -> dict[str, Any]:
    endpoint = os.environ.get("HERMES_STORY_INGEST_URL", "").strip()
    key_id = os.environ.get("HERMES_STORY_INGEST_KEY_ID", "").strip()
    secret = os.environ.get("HERMES_STORY_INGEST_SECRET", "")
    _require(endpoint.startswith(("https://", "http://127.0.0.1:", "http://localhost:")),
             "HERMES_STORY_INGEST_URL is not configured.")
    _require(bool(key_id), "HERMES_STORY_INGEST_KEY_ID is not configured.")
    _require(len(secret.encode("utf-8")) >= 32, "HERMES_STORY_INGEST_SECRET is not configured.")

    cached = _read_receipt(payload["referenceKey"], payload["contentHash"])
    if cached:
        return {**cached, "operation": "receipt"}

    prepared = _post_json(
        endpoint,
        {"action": "prepare_assets", **payload},
        key_id,
        secret,
        idempotent=True,
    )
    uploads = prepared.get("assets")
    _require(isinstance(uploads, list), "prepare_assets did not return uploads.")
    upload_by_order = {int(asset["narrativeOrder"]): asset for asset in uploads}
    _require(set(upload_by_order) == set(local_files), "Prepared uploads do not match the manifest.")

    published_assets = []
    for asset in payload["assets"]:
        order = asset["narrativeOrder"]
        upload = upload_by_order[order]
        upload_url = upload.get("uploadUrl")
        _require(isinstance(upload_url, str), f"Upload URL for story {order} is missing.")
        data = local_files[order].read_bytes()
        _request_bytes(
            upload_url,
            "PUT",
            data,
            {"content-type": asset["mimeType"]},
            retries=2,
        )
        published_assets.append({
            **asset,
            "storagePath": upload["storagePath"],
            "publicUrl": upload["publicUrl"],
        })

    result = _post_json(
        endpoint,
        {"action": "publish_reference", **payload, "assets": published_assets},
        key_id,
        secret,
        idempotent=False,
    )
    required = ("referenceKey", "referenceId", "templateId", "contentHash", "revision", "operation", "link")
    _require(all(result.get(key) is not None for key in required), "Publish read-back is incomplete.")
    _require(result["referenceKey"] == payload["referenceKey"], "Read-back referenceKey mismatch.")
    _require(result["contentHash"] == payload["contentHash"], "Read-back contentHash mismatch.")
    reference = result.get("reference")
    _require(isinstance(reference, dict), "Canonical reference read-back is missing.")
    actual_orders = [item.get("narrativeOrder") for item in reference.get("items", [])]
    expected_orders = [item["narrativeOrder"] for item in payload["reference"]["items"]]
    _require(actual_orders == expected_orders, "Canonical story order mismatch.")
    _write_receipt(result)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("validate", "publish"))
    parser.add_argument("payload", type=Path)
    args = parser.parse_args(argv)
    try:
        raw = json.loads(args.payload.read_text(encoding="utf-8"))
        _require(isinstance(raw, dict), "Payload root must be an object.")
        payload, local_files = prepare_payload(raw, args.payload.resolve())
        if args.command == "validate":
            result = {
                "ok": True,
                "referenceKey": payload["referenceKey"],
                "contentHash": payload["contentHash"],
                "stories": len(payload["reference"]["items"]),
                "assets": len(payload["assets"]),
            }
        else:
            result = publish(payload, local_files)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except (OSError, json.JSONDecodeError, PublishError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
