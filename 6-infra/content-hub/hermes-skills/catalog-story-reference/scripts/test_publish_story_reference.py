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
    conceptual_steps = [
        {
            "id": "step-identification",
            "title": "Cena específica",
            "description": "Instala uma situação reconhecível e uma pergunta.",
            "mechanism": "Usa evidência concreta antes de explicar.",
            "condition": "A cena precisa ser comprovável na captura.",
            "expectedResult": "Produz identificação e curiosidade.",
            "evidenceStoryOrders": [1],
        },
        {
            "id": "step-interpretation",
            "title": "Lente do especialista",
            "description": "Muda o significado da cena sem abandonar a história.",
            "mechanism": "Aplica repertório de nicho ao acontecimento.",
            "condition": "A interpretação deve pagar a pergunta inicial.",
            "expectedResult": "Produz recompensa e autoridade.",
            "evidenceStoryOrders": [min(2, stories)],
        },
        {
            "id": "step-principle",
            "title": "Princípio transferível",
            "description": "Converte a reação em posição pessoal.",
            "mechanism": "Fecha com uma regra de decisão coerente.",
            "condition": "O princípio precisa nascer da sequência.",
            "expectedResult": "Produz confiança sem autopromoção.",
            "evidenceStoryOrders": [stories],
        },
    ]
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
                "sourceExcerpt": f"Trecho original do story {order}.",
                "noSourceTextReason": None,
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
                    "markers": [{"label": str(order), "description": f"Marcador {order}"}],
                },
                "deep": {
                    "roleLabel": f"Detalhado {order}",
                    "title": f"Analise profunda {order}",
                    "lead": f"Leitura completa {order}",
                    "dimensionAssessments": {
                        "interaction": {
                            "status": "present",
                            "rationale": f"A tela {order} convida resposta.",
                        },
                        "critique": {
                            "status": "not-applicable",
                            "rationale": f"Nenhuma limitação adicional na tela {order}.",
                        },
                    },
                    "sections": [
                        {
                            "title": "Função narrativa",
                            "covers": ["narrative", "template-consequence"],
                            "paragraphs": [f"A tela {order} move a história e muda o molde."],
                        },
                        {
                            "title": "Continuidade",
                            "covers": ["continuity", "attention"],
                            "bullets": [f"A tela {order} paga a anterior e prepara a seguinte."],
                        },
                    ],
                    "extractedRule": f"Regra detalhada {order}",
                },
            },
        })
    payload = {
        "dossierContractVersion": "1.0",
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
                "moldSteps": [
                    {
                        "id": "mold-opening",
                        "templateStepIds": ["step-identification"],
                        "title": "Cena",
                        "purpose": "Abrir pergunta.",
                        "fixedFunction": "Comprovar a cena e abrir curiosidade.",
                        "placeholders": [
                            {"kind": "scene", "label": "Cena real"},
                            {"kind": "copy", "label": "Pergunta específica"},
                        ],
                    },
                    {
                        "id": "mold-lens",
                        "templateStepIds": ["step-interpretation"],
                        "title": "Lente",
                        "purpose": "Reinterpretar a cena.",
                        "fixedFunction": "Pagar o gancho com repertório.",
                        "placeholders": [
                            {"kind": "proof", "label": "Prova visual"},
                            {"kind": "copy", "label": "Interpretação"},
                        ],
                    },
                    {
                        "id": "mold-closing",
                        "templateStepIds": ["step-principle"],
                        "title": "Princípio",
                        "purpose": "Revelar uma regra pessoal.",
                        "fixedFunction": "Fechar com posicionamento.",
                        "placeholders": [
                            {"kind": "response", "label": "Reação do público"},
                            {"kind": "principle", "label": "Princípio"},
                        ],
                    },
                ],
                "steps": [
                    {"role": "hook", "instruction": "Abrir pergunta."},
                    {"role": "development", "instruction": "Aplicar a lente."},
                    {"role": "closing", "instruction": "Fechar com princípio."},
                ],
            },
            "steps": [
                {"role": "hook", "instruction": "Abrir pergunta."},
                {"role": "development", "instruction": "Aplicar a lente."},
                {"role": "closing", "instruction": "Fechar com princípio."},
            ],
        },
        "reference": {
            "title": "Referencia de teste",
            "description": "Dossie completo.",
            "sequenceConfirmed": True,
            "sequenceConfirmationSource": "Confirmada explicitamente pelo usuário.",
            "analysis": {
                "summary": "Resumo transversal.",
                "overview": ["Leitura geral."],
                "narrativeArc": ["cena", "principio"],
                "whyItWorks": ["Continuidade."],
                "templateFit": "Aderente.",
                "sequenceMap": [
                    *[
                        {
                            "kind": "story",
                            "storyOrder": order,
                            "label": f"{order} - Story",
                            "value": f"Função da tela {order}",
                        }
                        for order in range(1, stories + 1)
                    ],
                    {
                        "kind": "product",
                        "label": "Produto real",
                        "value": "Persona coerente.",
                    },
                ],
                "visualGrammar": "Gramatica visual.",
                "apparentProduct": "Uma história cotidiana.",
                "productRevealed": "Persona coerente.",
                "personaConstructed": "Especialista próximo e criterioso.",
                "transferRules": ["Transferir funcao."],
                "synthesis": [
                    {
                        "key": "screen-roles",
                        "title": "Papel de cada tela",
                        "paragraphs": ["A sequência distribui funções claras."],
                    },
                    {
                        "key": "stimulus-change",
                        "title": "Mudança de estímulo",
                        "paragraphs": ["O enquadramento muda sem perder continuidade."],
                    },
                    {
                        "key": "aesthetics-production",
                        "title": "Estética e produção",
                        "paragraphs": ["A captura preserva aparência nativa."],
                    },
                    {
                        "key": "strengths-limitations",
                        "title": "Forças e limitações",
                        "paragraphs": ["A força está na continuidade; depende de prova real."],
                    },
                ],
                "registeredTemplate": {
                    "name": "Cena -> lente -> principio",
                    "formula": "Cena -> lente -> princípio",
                    "useWhen": "Quando existe uma situação cotidiana comprovável.",
                    "primaryFunction": "Transformar rotina em posicionamento.",
                    "requiredElements": ["Cena real", "Interpretação", "Princípio"],
                    "optionalElements": ["Resposta do público"],
                    "executionRisks": ["Virar aula antes de pagar o gancho"],
                    "capturesOrInputs": ["Captura da cena", "Prova visual"],
                    "brunoAdaptation": "Aplicar a lente de psicologia e neurociência.",
                    "steps": conceptual_steps,
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
            client.canonical_request_path(self.path),
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
        with self.assertRaisesRegex(client.PublishError, "metadata.deep is required"):
            self.prepared(payload, path)

    def test_valid_dossier_reports_complete_coverage_without_network(self):
        payload, _ = make_payload(self.root)
        report = client.validate_dossier(payload)
        expected_dimensions = client.load_contract_schema()["$defs"]["coreDimension"]["enum"]
        self.assertTrue(report["ok"])
        self.assertFalse(report["networkAccessed"])
        self.assertEqual(report["contractVersion"], "1.0")
        self.assertEqual(
            report["storyCoverage"][0]["covered"],
            expected_dimensions,
        )
        self.assertEqual(FakeIngestHandler.actions, [])

    def test_effect_mirror_current_fixture_documents_the_legacy_gaps(self):
        fixture = (
            Path(__file__).resolve().parent.parent
            / "tests"
            / "fixtures"
            / "effect-mirror-current.json"
        )
        report = client.validate_dossier(
            json.loads(fixture.read_text(encoding="utf-8")),
            raise_on_error=False,
        )
        errors = "\n".join(report["errors"])

        self.assertFalse(report["ok"])
        self.assertFalse(report["networkAccessed"])
        self.assertIn("sequenceConfirmed is required", errors)
        self.assertIn("dimensionAssessments is required", errors)
        self.assertIn("templateStepIds is required", errors)
        self.assertIn("synthesis must contain at least 4", errors)

    def test_schema_version_is_read_from_the_canonical_schema(self):
        schema = client.load_contract_schema()
        self.assertEqual(schema["properties"]["dossierContractVersion"]["const"], "1.0")
        self.assertEqual(
            schema["$defs"]["synthesisKey"]["enum"],
            [
                "screen-roles",
                "stimulus-change",
                "aesthetics-production",
                "strengths-limitations",
            ],
        )

    def test_missing_continuity_is_blocking(self):
        payload, path = make_payload(self.root)
        payload["reference"]["items"][0]["metadata"]["deep"]["sections"][1]["covers"] = ["attention"]
        with self.assertRaisesRegex(client.PublishError, "continuity"):
            self.prepared(payload, path)

    def test_missing_product_map_entry_is_blocking(self):
        payload, path = make_payload(self.root)
        payload["reference"]["analysis"]["sequenceMap"] = [
            entry
            for entry in payload["reference"]["analysis"]["sequenceMap"]
            if entry["kind"] != "product"
        ]
        with self.assertRaisesRegex(client.PublishError, "product entry"):
            self.prepared(payload, path)

    def test_missing_synthesis_key_is_blocking(self):
        payload, path = make_payload(self.root)
        payload["reference"]["analysis"]["synthesis"].pop()
        with self.assertRaisesRegex(client.PublishError, "at least 4 item"):
            self.prepared(payload, path)

    def test_template_labels_without_mechanism_are_blocking(self):
        payload, path = make_payload(self.root)
        step = payload["reference"]["analysis"]["registeredTemplate"]["steps"][0]
        for field in ("title", "description", "mechanism", "condition", "expectedResult"):
            step[field] = "CTA"
        with self.assertRaisesRegex(client.PublishError, "not an operational movement"):
            self.prepared(payload, path)

    def test_unlinked_conceptual_step_is_blocking(self):
        payload, path = make_payload(self.root)
        payload["template"]["definition"]["moldSteps"][2]["templateStepIds"] = [
            "step-identification"
        ]
        with self.assertRaisesRegex(client.PublishError, "without a mold screen"):
            self.prepared(payload, path)

    def test_invalid_dossier_never_reaches_network(self):
        payload, path = make_payload(self.root)
        payload["dossierContractVersion"] = "0.9"
        with patch.object(client, "_request_bytes") as request:
            with self.assertRaises(client.PublishError):
                self.prepared(payload, path)
            request.assert_not_called()
        self.assertEqual(FakeIngestHandler.actions, [])

    def test_asset_hash_reference_key_and_content_hash_are_deterministic(self):
        payload, path = make_payload(self.root)
        first, files = self.prepared(payload, path)
        self.assertEqual(first["dossierContractVersion"], "1.0")
        second, _ = self.prepared(copy.deepcopy(payload), path)
        self.assertEqual(first, second)
        self.assertEqual(
            first["assets"][0]["sha256"],
            client.sha256_file(files[1]),
        )
        self.assertRegex(first["referenceKey"], r"^instagram-teste-[0-9a-f]{20}$")

    def test_hmac_matches_the_server_vector(self):
        body = b'{"action":"prepare_assets","referenceKey":"reference-1"}'
        self.assertEqual(client.canonical_request_path("/ci-story-ingest"), "/ci-story-ingest")
        self.assertEqual(client.canonical_request_path("/functions/v1/ci-story-ingest"), "/ci-story-ingest")
        signature = client.canonical_signature(
            "POST",
            "/ci-story-ingest",
            "1784916000000",
            "nonce_0123456789abcdef",
            body,
            SECRET,
        )
        self.assertEqual(signature, "cf507df23254b1a6df2a94917c79fdbde1d021caf8a04b4725b8d5f70dd4af45")

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
