#!/usr/bin/env python3

from __future__ import annotations

import copy
import json
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import publish_story_reference as client


SECRET = "hermes-agent-secret-with-at-least-32-bytes"
KEY_ID = "hermes-local"


def make_payload(root: Path, stories: int = 2) -> tuple[dict, Path]:
    assets = []
    items = []
    for order in range(1, stories + 1):
        asset_path = root / f"story-{order}.jpg"
        asset_path.write_bytes((f"asset-{order}-" * 20).encode())
        assets.append({
            "narrativeOrder": order,
            "localPath": str(asset_path),
            "mimeType": "image/jpeg",
        })
        items.append({
            "mediaType": "image",
            "textContent": f"Texto {order}",
            "sourceOccurredAt": None,
            "narrativeOrder": order,
            "narrativeRole": "hook" if order == 1 else "closing",
            "metadata": {
                "quick": {
                    "roleLabel": f"Rapido {order}",
                    "title": f"Resumo {order}",
                    "summary": f"Resumo curto {order}",
                    "evidence": f"Evidencia {order}",
                    "audienceEffect": f"Efeito {order}",
                    "subtext": f"Subtexto {order}",
                    "funnelFunction": f"Funil {order}",
                    "extractedRule": f"Regra curta {order}",
                },
                "visual": {
                    "roleLabel": f"Visual {order}",
                    "title": f"Raio-X {order}",
                    "scene": f"Cena {order}",
                    "typography": f"Tipografia {order}",
                    "composition": f"Composicao {order}",
                    "graphic": f"Grafico {order}",
                    "palette": ["#102f26", "#f6f1e7"],
                    "impression": f"Impressao {order}",
                },
                "deep": {
                    "roleLabel": f"Detalhado {order}",
                    "title": f"Analise profunda {order}",
                    "lead": f"Leitura completa {order}",
                    "sections": [{
                        "title": "Mecanismo",
                        "paragraphs": [f"Paragrafo {order}"],
                        "bullets": [f"Evidencia aprofundada {order}"],
                    }],
                    "extractedRule": f"Regra detalhada {order}",
                },
            },
        })
    payload = {
        "template": {
            "canonicalKey": "cena-lente-principio",
            "name": "Cena -> lente -> principio",
            "objective": "Transformar rotina em posicionamento.",
            "description": "Template de teste.",
            "tags": ["story"],
            "definition": {
                "editorialName": "Cena -> lente -> principio",
                "editorialSummary": "Resumo editorial.",
                "formula": "Cena -> lente -> principio",
                "preserveRules": ["Preservar funcao."],
                "adaptRules": ["Adaptar superficie."],
                "avoidRules": ["Evitar copia."],
                "moldSteps": [{
                    "title": "Cena",
                    "purpose": "Abrir pergunta.",
                    "placeholders": [{"kind": "scene", "label": "Cena real"}],
                }],
                "steps": [{"role": "hook", "instruction": "Abrir pergunta."}],
            },
            "steps": [{"role": "hook", "instruction": "Abrir pergunta."}],
        },
        "reference": {
            "title": "Referencia de teste",
            "description": "Dossie completo.",
            "analysis": {
                "summary": "Resumo transversal.",
                "overview": ["Leitura geral."],
                "narrativeArc": ["cena", "principio"],
                "whyItWorks": ["Continuidade."],
                "templateFit": "Aderente.",
                "sequenceMap": [{"label": "1", "value": "Gancho"}],
                "visualGrammar": "Gramatica visual.",
                "productRevealed": "Persona coerente.",
                "transferRules": ["Transferir funcao."],
                "synthesis": [{"title": "Sintese", "paragraphs": ["Leitura completa."]}],
                "registeredTemplate": {
                    "name": "Cena -> lente -> principio",
                    "steps": [{"title": "Cena", "description": "Abrir."}],
                },
                "sourceNote": "Sequencia completa.",
            },
            "platform": "instagram",
            "sourceAccount": "@teste",
            "sourceUrl": "https://www.instagram.com/teste/",
            "sourceStartedAt": "2026-07-24T12:00:00.000Z",
            "sourceEndedAt": "2026-07-24T12:05:00.000Z",
            "items": items,
        },
        "assets": assets,
    }
    payload_path = root / "payload.json"
    payload_path.write_text(json.dumps(payload), encoding="utf-8")
    return payload, payload_path


class FakeIngestHandler(BaseHTTPRequestHandler):
    actions: list[str] = []
    uploads: dict[int, bytes] = {}
    revisions: dict[str, tuple[str, int]] = {}
    mismatch_readback = False

    def log_message(self, *_args):
        return

    def _json(self, value: dict, status: int = 200):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        order = int(self.path.rsplit("/", 1)[-1])
        body = self.rfile.read(int(self.headers["content-length"]))
        type(self).actions.append(f"upload:{order}")
        type(self).uploads[order] = body
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        body = self.rfile.read(int(self.headers["content-length"]))
        expected = client.canonical_signature(
            "POST",
            self.path,
            self.headers["x-ci-agent-timestamp"],
            self.headers["x-ci-agent-nonce"],
            body,
            SECRET,
        )
        if self.headers["x-ci-agent-key"] != KEY_ID or self.headers["x-ci-agent-signature"] != expected:
            self._json({"ok": False, "error": {"code": "unauthorized"}}, 401)
            return
        payload = json.loads(body)
        action = payload["action"]
        type(self).actions.append(action)
        if action == "prepare_assets":
            port = self.server.server_port
            self._json({
                "ok": True,
                "referenceKey": payload["referenceKey"],
                "contentHash": payload["contentHash"],
                "assets": [{
                    "narrativeOrder": asset["narrativeOrder"],
                    "storagePath": f"story-references/{payload['referenceKey']}/{asset['narrativeOrder']}.jpg",
                    "publicUrl": f"https://cdn.example/{payload['referenceKey']}/{asset['narrativeOrder']}.jpg",
                    "uploadUrl": f"http://127.0.0.1:{port}/upload/{asset['narrativeOrder']}",
                } for asset in payload["assets"]],
            })
            return
        if len(type(self).uploads) != len(payload["assets"]):
            self._json({"ok": False, "error": {"code": "uploads_missing"}}, 409)
            return
        previous = type(self).revisions.get(payload["referenceKey"])
        if previous and previous[0] == payload["contentHash"]:
            revision, operation = previous[1], "unchanged"
        elif previous:
            revision, operation = previous[1] + 1, "updated"
        else:
            revision, operation = 1, "created"
        type(self).revisions[payload["referenceKey"]] = (payload["contentHash"], revision)
        orders = [item["narrativeOrder"] for item in payload["reference"]["items"]]
        if type(self).mismatch_readback:
            orders = list(reversed(orders))
        self._json({
            "ok": True,
            "referenceKey": payload["referenceKey"],
            "referenceId": "00000000-0000-4000-8000-000000000010",
            "templateId": "00000000-0000-4000-8000-000000000020",
            "contentHash": payload["contentHash"],
            "revision": revision,
            "operation": operation,
            "link": "https://app.example/?tab=content-templates&template=t&reference=r",
            "reference": {
                "items": [{"narrativeOrder": order} for order in orders],
            },
        })


class PublishStoryReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        client.RECEIPT_DIR = self.root / "receipts"
        FakeIngestHandler.actions = []
        FakeIngestHandler.uploads = {}
        FakeIngestHandler.revisions = {}
        FakeIngestHandler.mismatch_readback = False
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeIngestHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        os.environ["HERMES_STORY_INGEST_URL"] = (
            f"http://127.0.0.1:{self.server.server_port}/functions/v1/ci-story-ingest"
        )
        os.environ["HERMES_STORY_INGEST_KEY_ID"] = KEY_ID
        os.environ["HERMES_STORY_INGEST_SECRET"] = SECRET

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary.cleanup()

    def prepared(self, payload: dict, path: Path):
        return client.prepare_payload(payload, path)

    def test_validate_rejects_a_missing_dossier_layer(self):
        payload, path = make_payload(self.root)
        del payload["reference"]["items"][0]["metadata"]["deep"]
        with self.assertRaisesRegex(client.PublishError, "layer deep"):
            self.prepared(payload, path)

    def test_asset_hash_reference_key_and_content_hash_are_deterministic(self):
        payload, path = make_payload(self.root)
        first, files = self.prepared(payload, path)
        second, _ = self.prepared(copy.deepcopy(payload), path)
        self.assertEqual(first, second)
        self.assertEqual(
            first["assets"][0]["sha256"],
            client.sha256_file(files[1]),
        )
        self.assertRegex(first["referenceKey"], r"^instagram-teste-[0-9a-f]{20}$")

    def test_hmac_matches_the_server_vector(self):
        body = b'{"action":"prepare_assets","referenceKey":"reference-1"}'
        signature = client.canonical_signature(
            "POST",
            "/functions/v1/ci-story-ingest",
            "1784916000000",
            "nonce_0123456789abcdef",
            body,
            SECRET,
        )
        self.assertEqual(signature, "509cb040431e9e92801b9e1ef9e260c65b7fe8ab5b930ac0cd0f93c7fd476af5")

    def test_publish_uses_exact_upload_urls_and_waits_for_every_upload(self):
        payload, path = make_payload(self.root)
        prepared, files = self.prepared(payload, path)
        result = client.publish(prepared, files)
        self.assertEqual(result["operation"], "created")
        self.assertEqual(
            FakeIngestHandler.actions,
            ["prepare_assets", "upload:1", "upload:2", "publish_reference"],
        )
        self.assertEqual(FakeIngestHandler.uploads[1], files[1].read_bytes())

    def test_identical_publication_reuses_receipt_without_network(self):
        payload, path = make_payload(self.root)
        prepared, files = self.prepared(payload, path)
        client.publish(prepared, files)
        action_count = len(FakeIngestHandler.actions)
        result = client.publish(prepared, files)
        self.assertEqual(result["operation"], "receipt")
        self.assertEqual(len(FakeIngestHandler.actions), action_count)

    def test_correction_reuses_reference_key_and_creates_revision_two(self):
        payload, path = make_payload(self.root)
        prepared, files = self.prepared(payload, path)
        first = client.publish(prepared, files)
        payload["referenceKey"] = first["referenceKey"]
        payload["reference"]["analysis"]["summary"] = "Resumo transversal corrigido."
        corrected, corrected_files = self.prepared(payload, path)
        result = client.publish(corrected, corrected_files)
        self.assertEqual(result["operation"], "updated")
        self.assertEqual(result["revision"], 2)
        self.assertEqual(result["referenceKey"], first["referenceKey"])

    def test_readback_mismatch_does_not_write_receipt(self):
        payload, path = make_payload(self.root)
        prepared, files = self.prepared(payload, path)
        FakeIngestHandler.mismatch_readback = True
        with self.assertRaisesRegex(client.PublishError, "order mismatch"):
            client.publish(prepared, files)
        self.assertFalse((client.RECEIPT_DIR / f"{prepared['referenceKey']}.json").exists())

    def test_secret_never_appears_in_receipt_or_result(self):
        payload, path = make_payload(self.root)
        prepared, files = self.prepared(payload, path)
        result = client.publish(prepared, files)
        receipt = (client.RECEIPT_DIR / f"{prepared['referenceKey']}.json").read_text()
        self.assertNotIn(SECRET, receipt)
        self.assertNotIn(SECRET, json.dumps(result))

    def test_backoff_is_enabled_only_for_idempotent_posts(self):
        calls = []

        def fake_request(url, method, body, headers, retries):
            calls.append(retries)
            return b'{"ok":true}'

        with patch.object(client, "_request_bytes", fake_request):
            client._post_json("https://example.test/ingest", {}, KEY_ID, SECRET, idempotent=True)
            client._post_json("https://example.test/ingest", {}, KEY_ID, SECRET, idempotent=False)
        self.assertEqual(calls, [2, 0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
