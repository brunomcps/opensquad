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
SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "_shared" / "canonical-story-dossier.schema.json"
)
RECEIPT_DIR = Path(
    os.environ.get(
        "HERMES_STORY_RECEIPT_DIR",
        str(Path.home() / ".hermes/state/story-reference-publications"),
    )
)


class PublishError(RuntimeError):
    def __init__(self, message: str, report: dict[str, Any] | None = None):
        super().__init__(message)
        self.report = report


_SCHEMA_CACHE: dict[str, Any] | None = None

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


def load_contract_schema() -> dict[str, Any]:
    global _SCHEMA_CACHE
    if _SCHEMA_CACHE is None:
        try:
            schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise PublishError(f"Canonical dossier schema could not be loaded: {error}") from None
        _require(isinstance(schema, dict), "Canonical dossier schema root is invalid.")
        _SCHEMA_CACHE = schema
    return _SCHEMA_CACHE


def _resolve_schema_ref(root: dict[str, Any], reference: str) -> dict[str, Any]:
    _require(reference.startswith("#/"), f"Unsupported schema reference: {reference}")
    current: Any = root
    for raw_part in reference[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        _require(isinstance(current, dict) and part in current, f"Unknown schema reference: {reference}")
        current = current[part]
    _require(isinstance(current, dict), f"Schema reference is not an object: {reference}")
    return current


def _schema_type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    return False


def _validate_schema_node(
    value: Any,
    schema: dict[str, Any],
    path: str,
    root: dict[str, Any],
    errors: list[str],
) -> None:
    if "$ref" in schema:
        _validate_schema_node(value, _resolve_schema_ref(root, str(schema["$ref"])), path, root, errors)
        return

    if "anyOf" in schema:
        valid_branch = False
        for branch in schema["anyOf"]:
            branch_errors: list[str] = []
            _validate_schema_node(value, branch, path, root, branch_errors)
            if not branch_errors:
                valid_branch = True
                break
        if not valid_branch:
            errors.append(f"{path} does not satisfy any allowed schema shape.")

    expected_type = schema.get("type")
    if expected_type is not None:
        expected_types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_schema_type_matches(value, str(item)) for item in expected_types):
            errors.append(f"{path} must be of type {' or '.join(map(str, expected_types))}.")
            return

    if "const" in schema and value != schema["const"]:
        errors.append(f"{path} must equal {schema['const']!r}.")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path} must be one of {schema['enum']}.")

    if isinstance(value, str):
        min_length = int(schema.get("minLength", 0))
        if min_length and len(value.strip()) < min_length:
            errors.append(f"{path} must not be empty.")
        pattern = schema.get("pattern")
        if pattern and re.fullmatch(str(pattern), value) is None:
            errors.append(f"{path} does not match the required pattern.")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path} must be at least {schema['minimum']}.")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path} must be at most {schema['maximum']}.")

    if isinstance(value, list):
        if len(value) < int(schema.get("minItems", 0)):
            errors.append(f"{path} must contain at least {schema['minItems']} item(s).")
        if "maxItems" in schema and len(value) > int(schema["maxItems"]):
            errors.append(f"{path} must contain at most {schema['maxItems']} item(s).")
        if schema.get("uniqueItems"):
            serialized = [canonical_json(item) for item in value]
            if len(set(serialized)) != len(serialized):
                errors.append(f"{path} must contain unique items.")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                _validate_schema_node(item, item_schema, f"{path}[{index}]", root, errors)

    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}.{key} is required.")
        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    _validate_schema_node(value[key], child_schema, f"{path}.{key}", root, errors)
            if schema.get("additionalProperties") is False:
                extras = sorted(set(value) - set(properties))
                if extras:
                    errors.append(f"{path} contains unsupported field(s): {', '.join(extras)}.")


def schema_errors(payload: dict[str, Any]) -> list[str]:
    schema = load_contract_schema()
    errors: list[str] = []
    _validate_schema_node(payload, schema, "$", schema, errors)
    return errors


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


def _validate_source_library(value: Any) -> None:
    _require(isinstance(value, dict), "reference.analysis.sourceLibrary is invalid.")
    total_pages = value.get("totalPages")
    covered_start = value.get("coveredPageStart")
    covered_end = value.get("coveredPageEnd")
    _require(isinstance(total_pages, int) and 1 <= total_pages <= 10_000,
             "sourceLibrary.totalPages is invalid.")
    _require(
        isinstance(covered_start, int)
        and isinstance(covered_end, int)
        and 1 <= covered_start <= covered_end <= total_pages,
        "sourceLibrary covered page range is invalid.",
    )
    categories = _nonempty_list(value.get("categories"), "sourceLibrary.categories")
    category_keys: set[str] = set()
    for category in categories:
        _require(isinstance(category, dict), "sourceLibrary category is invalid.")
        key = str(category.get("key", ""))
        _require(CANONICAL_KEY.fullmatch(key) is not None and key not in category_keys,
                 "sourceLibrary category key is invalid or duplicated.")
        _require(bool(str(category.get("label", "")).strip()),
                 "sourceLibrary category label is required.")
        category_keys.add(key)

    modules = _nonempty_list(value.get("modules"), "sourceLibrary.modules")
    _require(len(modules) <= 40, "sourceLibrary accepts at most 40 modules.")
    orders: list[int] = []
    module_keys: set[str] = set()
    for module in modules:
        _require(isinstance(module, dict), "sourceLibrary module is invalid.")
        key = str(module.get("key", ""))
        _require(CANONICAL_KEY.fullmatch(key) is not None and key not in module_keys,
                 "sourceLibrary module key is invalid or duplicated.")
        module_keys.add(key)
        order = module.get("order")
        _require(isinstance(order, int), "sourceLibrary module order is invalid.")
        orders.append(order)
        _require(module.get("category") in category_keys,
                 "sourceLibrary module category is unknown.")
        page_start = module.get("pageStart")
        page_end = module.get("pageEnd")
        _require(
            isinstance(page_start, int)
            and isinstance(page_end, int)
            and covered_start <= page_start <= page_end <= covered_end,
            "sourceLibrary module page range is invalid.",
        )
        quick = module.get("quick")
        _require(isinstance(quick, dict), "sourceLibrary module quick layer is required.")
        for field in ("summary", "outcome", "useWhen"):
            _require(bool(str(quick.get(field, "")).strip()),
                     f"sourceLibrary module quick.{field} is required.")
        for field in ("principles", "techniques", "cautions", "brunoApplications"):
            _nonempty_list(module.get(field), f"sourceLibrary module {field}")
        mold = module.get("mold")
        _require(isinstance(mold, dict), "sourceLibrary module mold is required.")
        _require(bool(str(mold.get("name", "")).strip())
                 and bool(str(mold.get("formula", "")).strip()),
                 "sourceLibrary module mold name and formula are required.")
        _nonempty_list(mold.get("steps"), "sourceLibrary module mold steps")
    _require(orders == list(range(1, len(modules) + 1)),
             "sourceLibrary module order must be continuous and start at 1.")


def _mime_type(path: Path, declared: str | None) -> str:
    mime = declared or mimetypes.guess_type(path.name)[0]
    _require(mime in ALLOWED_MIME_TYPES, f"Unsupported MIME type for {path.name}.")
    return str(mime)


def _meaningful(value: Any) -> str:
    return str(value).strip() if isinstance(value, str) else ""


def _flatten_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    if isinstance(value, list):
        return [text for item in value for text in _flatten_strings(item)]
    if isinstance(value, dict):
        return [text for item in value.values() for text in _flatten_strings(item)]
    return []


def _normalized_texts(value: Any) -> set[str]:
    return {
        re.sub(r"\s+", " ", text).strip().casefold()
        for text in _flatten_strings(value)
        if len(text.strip()) >= 12
    }


def validate_dossier(
    payload: dict[str, Any],
    *,
    raise_on_error: bool = True,
) -> dict[str, Any]:
    schema = load_contract_schema()
    core_dimensions = list(schema["$defs"]["coreDimension"]["enum"])
    synthesis_keys = list(schema["$defs"]["synthesisKey"]["enum"])
    report: dict[str, Any] = {
        "contractVersion": payload.get("dossierContractVersion"),
        "errors": schema_errors(payload),
        "warnings": [],
        "storyCoverage": [],
        "sequenceCoverage": {},
        "networkAccessed": False,
    }
    errors: list[str] = report["errors"]
    warnings: list[str] = report["warnings"]

    if not errors:
        template = payload["template"]
        definition = template["definition"]
        reference = payload["reference"]
        items = reference["items"]
        analysis = reference["analysis"]
        expected_orders = list(range(1, len(items) + 1))
        actual_orders = [item["narrativeOrder"] for item in items]
        if actual_orders != expected_orders:
            errors.append("reference.items must have continuous narrativeOrder starting at 1.")

        for order, item in zip(expected_orders, items):
            metadata = item["metadata"]
            quick = metadata["quick"]
            visual = metadata["visual"]
            deep = metadata["deep"]
            source_excerpt = _meaningful(metadata.get("sourceExcerpt"))
            no_source_reason = _meaningful(metadata.get("noSourceTextReason"))
            if not source_excerpt and not no_source_reason:
                errors.append(
                    f"Story {order} requires sourceExcerpt or noSourceTextReason."
                )
            if source_excerpt and no_source_reason:
                errors.append(
                    f"Story {order} cannot use sourceExcerpt and noSourceTextReason together."
                )

            titles = [
                _meaningful(quick.get("title")).casefold(),
                _meaningful(visual.get("title")).casefold(),
                _meaningful(deep.get("title")).casefold(),
            ]
            if len(set(titles)) != 3:
                errors.append(
                    f"Story {order} quick, visual, and deep titles must be distinct."
                )

            if (
                _meaningful(quick.get("summary")).casefold()
                == _meaningful(visual.get("scene")).casefold()
                == _meaningful(deep.get("lead")).casefold()
            ):
                errors.append(
                    f"Story {order} reuses the same sentence as all three dossier layers."
                )

            covered = {
                "evidence",
                "funnel",
                "subtext",
                "template-consequence",
            }
            if _meaningful(visual.get("composition")) or visual.get("markers"):
                covered.add("attention")
            explicit_deep: set[str] = set()
            for section_index, section in enumerate(deep["sections"], 1):
                section_text = _flatten_strings({
                    "paragraphs": section.get("paragraphs"),
                    "bullets": section.get("bullets"),
                })
                if not section_text:
                    errors.append(
                        f"Story {order} deep section {section_index} has no analysis content."
                    )
                    continue
                section_covers = set(section["covers"])
                covered.update(section_covers)
                explicit_deep.update(section_covers)
                if sum(len(text) for text in section_text) > 1_600:
                    warnings.append(
                        f"Story {order} deep section {section_index} is unusually long."
                    )

            missing = [dimension for dimension in core_dimensions if dimension not in covered]
            if missing:
                errors.append(
                    f"Story {order} is missing core coverage: {', '.join(missing)}."
                )
            for required_deep in ("narrative", "continuity"):
                if required_deep not in explicit_deep:
                    errors.append(
                        f"Story {order} must cover {required_deep} explicitly in deep.sections."
                    )

            if not visual.get("markers"):
                warnings.append(f"Story {order} has no visual markers.")
            if sum(len(text) for text in _flatten_strings(deep)) < 180:
                warnings.append(f"Story {order} deep analysis is unusually sparse.")

            def layer_body(layer: dict[str, Any]) -> dict[str, Any]:
                return {key: value for key, value in layer.items() if key not in {"roleLabel", "title"}}

            layer_sets = {
                "quick": _normalized_texts(layer_body(quick)),
                "visual": _normalized_texts(layer_body(visual)),
                "deep": _normalized_texts(layer_body(deep)),
            }
            repeated = (
                layer_sets["quick"] & layer_sets["visual"]
                | layer_sets["quick"] & layer_sets["deep"]
                | layer_sets["visual"] & layer_sets["deep"]
            )
            if repeated:
                warnings.append(
                    f"Story {order} repeats exact text across layers: {sorted(repeated)[0][:80]}."
                )

            assessments = deep["dimensionAssessments"]
            report["storyCoverage"].append({
                "narrativeOrder": order,
                "covered": [dimension for dimension in core_dimensions if dimension in covered],
                "missing": missing,
                "contextual": {
                    key: assessments[key]["status"]
                    for key in ("interaction", "critique")
                },
            })

        sequence_map = analysis["sequenceMap"]
        story_map = [entry for entry in sequence_map if entry["kind"] == "story"]
        product_map = [entry for entry in sequence_map if entry["kind"] == "product"]
        mapped_orders = [entry.get("storyOrder") for entry in story_map]
        if mapped_orders != expected_orders:
            errors.append("reference.analysis.sequenceMap must map every story once and in order.")
        if len(product_map) != 1:
            errors.append("reference.analysis.sequenceMap must contain exactly one product entry.")
        if any("storyOrder" in entry for entry in product_map):
            errors.append("The product sequenceMap entry must not declare storyOrder.")

        actual_synthesis_keys = [block["key"] for block in analysis["synthesis"]]
        if set(actual_synthesis_keys) != set(synthesis_keys) or len(actual_synthesis_keys) != len(synthesis_keys):
            errors.append(
                "reference.analysis.synthesis must contain each canonical key exactly once."
            )

        registered = analysis["registeredTemplate"]
        registered_steps = registered["steps"]
        registered_ids = [step["id"] for step in registered_steps]
        if len(set(registered_ids)) != len(registered_ids):
            errors.append("registeredTemplate step ids must be unique.")
        expected_order_set = set(expected_orders)
        generic_labels = {"identificacao", "identificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o", "conteudo", "conteÃƒÆ’Ã‚Âºdo", "cta"}
        for step in registered_steps:
            evidence_orders = set(step["evidenceStoryOrders"])
            if not evidence_orders <= expected_order_set:
                errors.append(
                    f"Registered step {step['id']} references an unknown story order."
                )
            semantic_values = {
                _meaningful(step[field]).casefold()
                for field in ("title", "description", "mechanism", "condition", "expectedResult")
            }
            if len(semantic_values) < 4 or _meaningful(step["title"]).casefold() in generic_labels:
                errors.append(
                    f"Registered step {step['id']} is a label, not an operational movement."
                )

        mold_steps = definition["moldSteps"]
        mold_ids = [step["id"] for step in mold_steps]
        if len(set(mold_ids)) != len(mold_ids):
            errors.append("template.definition.moldSteps ids must be unique.")
        linked_template_ids: set[str] = set()
        valid_template_ids = set(registered_ids)
        message_kinds = {"copy", "principle"}
        evidence_kinds = {"scene", "person", "proof", "response"}
        for mold_step in mold_steps:
            linked = set(mold_step["templateStepIds"])
            linked_template_ids.update(linked)
            unknown = linked - valid_template_ids
            if unknown:
                errors.append(
                    f"Mold step {mold_step['id']} references unknown template step(s): "
                    f"{', '.join(sorted(unknown))}."
                )
            kinds = {placeholder["kind"] for placeholder in mold_step["placeholders"]}
            if not kinds & message_kinds:
                errors.append(f"Mold step {mold_step['id']} needs a message placeholder.")
            if not kinds & evidence_kinds:
                errors.append(f"Mold step {mold_step['id']} needs an evidence or scene placeholder.")
        unlinked = valid_template_ids - linked_template_ids
        if unlinked:
            errors.append(
                f"Conceptual template steps without a mold screen: {', '.join(sorted(unlinked))}."
            )

        if template["steps"] != definition["steps"]:
            errors.append(
                "template.steps and template.definition.steps must be identical compatibility projections."
            )
        if len(mold_steps) != len(items):
            warnings.append(
                "The number of mold screens differs from the number of reference stories."
            )
        if analysis.get("sourceLibrary") is not None:
            try:
                _validate_source_library(analysis["sourceLibrary"])
            except PublishError as error:
                errors.append(str(error))

        report["sequenceCoverage"] = {
            "storyCount": len(items),
            "mappedStoryOrders": mapped_orders,
            "hasProduct": len(product_map) == 1,
            "synthesisKeys": actual_synthesis_keys,
            "templateStepIds": registered_ids,
            "moldStepIds": mold_ids,
            "coveredTemplateStepIds": sorted(linked_template_ids),
        }

    report["ok"] = not errors
    if errors and raise_on_error:
        summary = "; ".join(errors[:8])
        if len(errors) > 8:
            summary += f"; and {len(errors) - 8} more error(s)"
        raise PublishError(f"Dossier validation failed: {summary}", report=report)
    return report


def _validate_dossier(payload: dict[str, Any]) -> dict[str, Any]:
    return validate_dossier(payload, raise_on_error=True)


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
        "dossierContractVersion": raw["dossierContractVersion"],
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
        "dossierContractVersion": payload["dossierContractVersion"],
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


def canonical_request_path(path: str) -> str:
    match = re.fullmatch(r"/functions/v1/([^/]+)/?", path)
    return f"/{match.group(1)}" if match else path


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
            "POST", canonical_request_path(parsed.path), timestamp, nonce, body, secret
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
        report = validate_dossier(raw)
        payload, local_files = prepare_payload(raw, args.payload.resolve())
        if args.command == "validate":
            result = {
                **report,
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
        if isinstance(error, PublishError) and error.report is not None:
            print(json.dumps(error.report, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        else:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
