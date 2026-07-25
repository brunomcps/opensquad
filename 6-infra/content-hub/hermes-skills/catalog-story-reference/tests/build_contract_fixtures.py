#!/usr/bin/env python3
"""Build deterministic contract fixtures from the approved Raul migrations."""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path
from typing import Any


CONTENT_HUB = Path(__file__).resolve().parents[3]
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
VISUAL_MIGRATION = (
    CONTENT_HUB / "supabase/migrations/20260724223000_ci_raul_sena_visual_dossier.sql"
)
FIDELITY_MIGRATION = (
    CONTENT_HUB / "supabase/migrations/20260725013000_ci_raul_sena_dossier_fidelity.sql"
)


def json_blocks(path: Path) -> list[dict[str, Any]]:
    source = path.read_text(encoding="utf-8")
    tag = re.escape("$json$")
    return [
        json.loads(raw)
        for raw in re.findall(f"{tag}(.*?){tag}::jsonb", source, re.DOTALL)
    ]


def add_covers(deep: dict[str, Any], covers: list[list[str]]) -> None:
    if len(deep["sections"]) != len(covers):
        raise RuntimeError("Raul deep-section baseline changed; update the coverage map.")
    for section, dimensions in zip(deep["sections"], covers):
        section["covers"] = dimensions


def build_raul() -> dict[str, Any]:
    visual = json_blocks(VISUAL_MIGRATION)
    fidelity = json_blocks(FIDELITY_MIGRATION)
    if (len(visual), len(fidelity)) != (5, 8):
        raise RuntimeError("Raul migration shape changed; fixture extraction is no longer safe.")

    definition = {**visual[0], **fidelity[0]}
    analysis = {**visual[1], **fidelity[1]}
    synthesis_keys = [
        "screen-roles",
        "stimulus-change",
        "aesthetics-production",
        "strengths-limitations",
    ]
    for block, key in zip(analysis["synthesis"], synthesis_keys):
        block["key"] = key

    conceptual_details = [
        {
            "id": "step-scene",
            "mechanism": "Instala um conflito pequeno por meio de uma cena específica e comprovável.",
            "condition": "A captura precisa mostrar a situação antes da interpretação.",
            "expectedResult": "Produz identificação e abre uma pergunta narrativa.",
            "evidenceStoryOrders": [1],
        },
        {
            "id": "step-lens",
            "mechanism": "Reinterpreta o acontecimento com repertório que pertence ao nicho.",
            "condition": "A virada precisa pagar a curiosidade sem abandonar a cena.",
            "expectedResult": "Entrega humor e autoridade sem virar aula.",
            "evidenceStoryOrders": [2],
        },
        {
            "id": "step-audience-response",
            "mechanism": "Transforma uma mensagem do público em continuação da narrativa.",
            "condition": "A reação precisa acrescentar tensão, prova ou status.",
            "expectedResult": "Traz prova social sem parecer depoimento fabricado.",
            "evidenceStoryOrders": [3],
        },
        {
            "id": "step-principle",
            "mechanism": "Responde à audiência com uma regra que organiza a decisão do creator.",
            "condition": "O princípio precisa nascer da situação mostrada.",
            "expectedResult": "Revela posicionamento sem autopromoção direta.",
            "evidenceStoryOrders": [3],
        },
    ]
    registered = analysis["registeredTemplate"]
    registered.update({
        "formula": "Cena real -> lente do especialista -> resposta do público -> princípio pessoal",
        "useWhen": "Quando uma situação cotidiana pode revelar como o especialista pensa.",
        "primaryFunction": "Transformar rotina em posicionamento sem abrir com uma aula.",
        "requiredElements": [
            "Cena real comprovável",
            "Interpretação própria do nicho",
            "Fechamento coerente com a cena",
        ],
        "optionalElements": ["Resposta espontânea do público", "Dado ou gráfico"],
        "executionRisks": list(definition["risks"]),
        "capturesOrInputs": [
            "Registro da cena cotidiana",
            "Prova visual da interpretação",
            "Resposta do público quando houver",
        ],
        "brunoAdaptation": (
            "Trocar finanças por psicologia e neurociência, preservando cena, "
            "continuidade e princípio."
        ),
    })
    for step, details in zip(registered["steps"], conceptual_details):
        step.update(details)

    mold_links = [
        ["step-scene"],
        ["step-lens"],
        ["step-audience-response", "step-principle"],
    ]
    for index, (mold, links) in enumerate(zip(definition["moldSteps"], mold_links), 1):
        mold["id"] = f"mold-{index}"
        mold["templateStepIds"] = links

    coverage_maps = [
        [
            ["evidence", "attention", "template-consequence"],
            ["narrative", "continuity"],
            ["continuity"],
        ],
        [
            ["narrative", "continuity", "subtext"],
            ["evidence", "attention"],
            ["funnel", "continuity"],
        ],
        [
            ["evidence", "subtext"],
            ["narrative", "continuity"],
            ["evidence", "attention"],
            ["funnel", "template-consequence"],
            ["subtext"],
        ],
    ]
    assessments = [
        {
            "interaction": {
                "status": "present",
                "rationale": "O conflito discutível convida respostas espontâneas.",
            },
            "critique": {
                "status": "not-applicable",
                "rationale": "A leitura está ancorada na cena e não exige ressalva adicional.",
            },
        },
        {
            "interaction": {
                "status": "present",
                "rationale": "As reações com emojis prolongam a conversa.",
            },
            "critique": {
                "status": "present",
                "rationale": "O gráfico funciona como selo visual, mas seus números são pouco legíveis.",
            },
        },
        {
            "interaction": {
                "status": "present",
                "rationale": "A resposta de um seguidor vira o motor explícito da tela.",
            },
            "critique": {
                "status": "not-applicable",
                "rationale": "A atribuição de status vem do público e a resposta permanece sóbria.",
            },
        },
    ]
    roles = ["hook", "development", "closing"]
    assets = [
        "01-conflito-no-aviao.jpg",
        "02-humor-e-inss.jpg",
        "03-principio-do-jato.jpg",
    ]
    items = []
    for index in range(3):
        metadata = {**visual[index + 2], "quick": fidelity[2 + index * 2], "deep": fidelity[3 + index * 2]}
        metadata["noSourceTextReason"] = None
        metadata["deep"]["dimensionAssessments"] = assessments[index]
        add_covers(metadata["deep"], coverage_maps[index])
        items.append({
            "mediaType": "image",
            "textContent": metadata["sourceExcerpt"],
            "sourceOccurredAt": None,
            "narrativeOrder": index + 1,
            "narrativeRole": roles[index],
            "metadata": metadata,
        })

    sequence_map = []
    for index, entry in enumerate(analysis["sequenceMap"]):
        if index < 3:
            sequence_map.append({"kind": "story", "storyOrder": index + 1, **entry})
        else:
            sequence_map.append({"kind": "product", **entry})
    analysis["sequenceMap"] = sequence_map
    analysis["apparentProduct"] = "Uma troca de assento durante um voo."
    analysis["personaConstructed"] = (
        "Pessoa bem-sucedida, acessível, espirituosa e financeiramente racional."
    )

    legacy_steps = copy.deepcopy(definition["steps"])
    return {
        "dossierContractVersion": "1.0",
        "referenceKey": "instagram-raulsena-cena-lente-principio",
        "template": {
            "canonicalKey": "cena-real-lente-especialista-principio",
            "name": "Cena -> lente -> princípio",
            "objective": "Transformar rotina em posicionamento sem abrir com uma aula.",
            "description": (
                "Parte de uma cena cotidiana, muda seu significado pela lente do "
                "especialista e termina revelando um princípio pessoal."
            ),
            "tags": ["cena real", "lente do especialista", "posicionamento", "story"],
            "definition": definition,
            "steps": legacy_steps,
        },
        "reference": {
            "title": "Raul Sena, cena -> humor -> princípio",
            "description": analysis["overview"][0],
            "sequenceConfirmed": True,
            "sequenceConfirmationSource": "Sequência fundadora preservada nas migrations aprovadas.",
            "analysis": analysis,
            "platform": "instagram",
            "sourceAccount": "@_raulsena",
            "sourceUrl": "https://www.instagram.com/_raulsena/",
            "sourceStartedAt": None,
            "sourceEndedAt": None,
            "items": items,
        },
        "assets": [
            {
                "narrativeOrder": index + 1,
                "localPath": f"../../../../ci-app/public/story-references/raul-sena/{name}",
                "mimeType": "image/jpeg",
            }
            for index, name in enumerate(assets)
        ],
    }


def build_thin(raul: dict[str, Any]) -> dict[str, Any]:
    thin = copy.deepcopy(raul)
    thin["referenceKey"] = "fixture-thin-dossier"
    thin["reference"]["title"] = "Payload raso de controle"
    thin["reference"]["analysis"]["sequenceMap"] = [
        entry for entry in thin["reference"]["analysis"]["sequenceMap"]
        if entry["kind"] == "story"
    ]
    for block in thin["reference"]["analysis"]["synthesis"]:
        block["key"] = "screen-roles"
    step = thin["reference"]["analysis"]["registeredTemplate"]["steps"][0]
    for field in ("title", "description", "mechanism", "condition", "expectedResult"):
        step[field] = "CTA"
    for item in thin["reference"]["items"]:
        metadata = item["metadata"]
        repeated = "Texto genérico repetido em todas as camadas."
        metadata["quick"]["summary"] = repeated
        metadata["visual"]["scene"] = repeated
        metadata["deep"]["lead"] = repeated
        for section in metadata["deep"]["sections"]:
            section["covers"] = ["evidence"]
    return thin


def write_fixture(name: str, payload: dict[str, Any]) -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    (FIXTURE_DIR / name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    raul = build_raul()
    write_fixture("raul-golden.json", raul)
    write_fixture("thin-dossier.json", build_thin(raul))
