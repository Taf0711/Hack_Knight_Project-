"""
Repeatable backend validation loop.

This script runs the same checks we have been using manually:
- syntax/compile checks
- API health
- document discovery
- lexical retrieval smoke checks against the Amazon report
- optional controlled cleanup + analyze run against the Bloomberg report
- saved-claim page consistency against verified citation pages

Usage examples:
  python3 backend/tests/validation_loop.py
  python3 backend/tests/validation_loop.py --rounds 2 --run-analysis
"""

from __future__ import annotations

import argparse
import json
import pathlib
import py_compile
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[2]
API_BASE = "http://localhost:8000"
BACKEND_FILES = [
    ROOT / "backend" / "main.py",
    ROOT / "backend" / "services" / "claim_extractor.py",
    ROOT / "backend" / "services" / "evidence_analyzer.py",
    ROOT / "backend" / "services" / "rag.py",
    ROOT / "backend" / "utils" / "grounding.py",
]


class ValidationError(RuntimeError):
    pass


def log(message: str) -> None:
    print(message, flush=True)


def request_json(path: str, method: str = "GET", timeout: int = 60) -> Any:
    request = urllib.request.Request(f"{API_BASE}{path}", method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def wait_for_health(retries: int = 30, delay: float = 1.0) -> None:
    last_error = None
    for _ in range(retries):
        try:
            payload = request_json("/health", timeout=5)
            if payload.get("status") == "healthy":
                return
            last_error = f"Unexpected health payload: {payload}"
        except Exception as exc:  # pragma: no cover - runtime validation
            last_error = repr(exc)
        time.sleep(delay)
    raise ValidationError(f"Health check did not recover: {last_error}")


def compile_check() -> None:
    for path in BACKEND_FILES:
        py_compile.compile(str(path), doraise=True)


def discover_documents() -> dict[str, dict[str, Any]]:
    documents = request_json("/api/documents")
    discovered: dict[str, dict[str, Any]] = {}
    for document in documents:
        title = (document.get("title") or "").lower()
        if "amazon" in title and "amazon" not in discovered:
            discovered["amazon"] = document
        if "bloomberg" in title and "bloomberg" not in discovered:
            discovered["bloomberg"] = document
    return discovered


def segment_endpoint_check(document_id: str) -> None:
    payload = request_json(f"/api/documents/{document_id}/segments", timeout=180)
    if payload.get("document_id") != document_id:
        raise ValidationError(f"Unexpected segment payload document id: {payload}")
    if payload.get("total_pages", 0) <= 0:
        raise ValidationError(f"Segment payload missing total_pages: {payload}")
    if not payload.get("pages"):
        raise ValidationError("Segment payload returned no page segments")
    if not payload.get("extraction_batches"):
        raise ValidationError("Segment payload returned no extraction batches")


def run_docker_python(code: str) -> Any:
    result = subprocess.run(
        [
            "docker",
            "exec",
            "greenwash_api",
            "sh",
            "-lc",
            f"cd /app && python - <<'PY'\n{code}\nPY",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise ValidationError(
            "docker exec failed: "
            f"stdout={result.stdout.strip()} stderr={result.stderr.strip()}"
        )
    return json.loads(result.stdout.strip())


def retrieval_smoke_check(amazon_document_id: str) -> None:
    checks = [
        {
            "query": "Amazon Devices received commitments from 93 suppliers in 2024",
            "expected_substring": "93 suppliers",
            "expected_pages": [15],
        },
        {
            "query": "in 2024, 85% of our waste was diverted from landfill",
            "expected_substring": "85% of our waste",
            "expected_pages": [4, 20],
        },
        {
            "query": "reduced the carbon emissions per shipped unit by roughly one-third since 2019",
            "expected_substring": "roughly one-third since 2019",
            "expected_pages": [9],
        },
    ]
    payload = json.dumps({"document_id": amazon_document_id, "checks": checks})
    code = f"""
import json
from sqlmodel import Session
from database import engine
from services.rag import RAGService

payload = json.loads({payload!r})
rag = RAGService()
session = Session(engine)
results = []
try:
    for item in payload["checks"]:
        hits = rag.lexical_search(
            session=session,
            query_text=item["query"],
            document_id=payload["document_id"],
            top_k=3,
        )
        results.append({{
            "query": item["query"],
            "hit_count": len(hits),
            "any_contains_expected": any(
                item["expected_substring"].lower() in hit["text"].lower()
                for hit in hits
            ),
            "returned_pages": [hit["page"] for hit in hits],
        }})
finally:
    session.close()

    print(json.dumps(results))
"""
    results = run_docker_python(code)
    failures = []
    for item, expected in zip(results, checks):
        page_match = any(page in expected["expected_pages"] for page in item["returned_pages"])
        if item["hit_count"] == 0 or (not item["any_contains_expected"] and not page_match):
            failures.append(item)
    if failures:
        raise ValidationError(f"Retrieval smoke check failed: {failures}")


def cleanup_claims(document_id: str) -> None:
    response = request_json(f"/api/documents/{document_id}/claims", method="DELETE", timeout=120)
    if "Deleted" not in response.get("message", ""):
        raise ValidationError(f"Unexpected cleanup response: {response}")


def run_analysis(document_id: str) -> dict[str, Any]:
    return request_json(f"/api/documents/{document_id}/analyze", method="POST", timeout=600)


def fetch_claims(document_id: str) -> list[dict[str, Any]]:
    claims = request_json(f"/api/documents/{document_id}/claims", timeout=120)
    if not isinstance(claims, list):
        raise ValidationError(f"Unexpected claims payload: {claims}")
    return claims


def dominant_verified_page(claim: dict[str, Any]) -> int | None:
    pages = [
        citation.get("page")
        for evidence in claim.get("evidence", [])
        for citation in (evidence.get("citations") or [])
        if citation.get("validation", {}).get("verified")
        and citation.get("page") is not None
    ]
    if not pages:
        return None
    return statistics.mode(pages)


def validate_analyzed_claims(claims: list[dict[str, Any]]) -> None:
    if not claims:
        raise ValidationError("Analysis returned zero claims")

    verified_citation_count = 0
    mismatched_pages = []
    for claim in claims:
        dominant_page = dominant_verified_page(claim)
        for evidence in claim.get("evidence", []):
            for citation in evidence.get("citations") or []:
                if citation.get("validation", {}).get("verified"):
                    verified_citation_count += 1
        if dominant_page is not None and claim.get("page") != dominant_page:
            mismatched_pages.append(
                {
                    "claim": claim.get("claim_text", "")[:120],
                    "claim_page": claim.get("page"),
                    "dominant_verified_page": dominant_page,
                }
            )

    if verified_citation_count == 0:
        raise ValidationError("No verified citations were saved")
    if mismatched_pages:
        raise ValidationError(f"Claim page mismatch detected: {mismatched_pages}")


def validation_round(round_number: int, run_analysis_flag: bool) -> None:
    log(f"[round {round_number}] compile check")
    compile_check()

    log(f"[round {round_number}] health check")
    wait_for_health()

    log(f"[round {round_number}] document discovery")
    documents = discover_documents()
    if "amazon" not in documents:
        raise ValidationError("Amazon document not found")

    log(f"[round {round_number}] segment endpoint check")
    segment_endpoint_check(documents["amazon"]["id"])

    log(f"[round {round_number}] retrieval smoke check")
    retrieval_smoke_check(documents["amazon"]["id"])

    if run_analysis_flag:
        if "bloomberg" not in documents:
            raise ValidationError("Bloomberg document not found")

        bloomberg_id = documents["bloomberg"]["id"]
        log(f"[round {round_number}] cleanup Bloomberg claims")
        cleanup_claims(bloomberg_id)

        log(f"[round {round_number}] analyze Bloomberg document")
        analysis = run_analysis(bloomberg_id)
        if analysis.get("total_claims", 0) < 1:
            raise ValidationError(f"Unexpected analysis result: {analysis}")

        log(f"[round {round_number}] validate saved claims")
        claims = fetch_claims(bloomberg_id)
        validate_analyzed_claims(claims)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=1)
    parser.add_argument("--run-analysis", action="store_true")
    args = parser.parse_args()

    for round_number in range(1, args.rounds + 1):
        validation_round(round_number, run_analysis_flag=args.run_analysis)

    log("validation loop passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValidationError, urllib.error.HTTPError, subprocess.CalledProcessError) as exc:
        log(f"validation loop failed: {exc}")
        raise SystemExit(1)
