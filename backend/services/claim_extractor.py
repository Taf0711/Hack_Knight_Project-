from typing import List, Dict
import json
import re
from difflib import SequenceMatcher
from google import genai
from google.genai import types
import structlog
from config import GEMINI_API_KEY
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from prompts.templates import get_claim_extraction_prompt, get_document_summary_prompt
from services.document_segmentation import DocumentSegmentationService

logger = structlog.get_logger()


class ClaimExtractor:
    """Extract environmental claims from documents using Gemini"""
    
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"
        self.logger = logger.bind(service="claim_extractor")
        self.segmenter = DocumentSegmentationService()
        self.segment_target_chars = 6500
        self.segment_overlap_chars = 600

    def _claim_response_schema(self) -> Dict:
        return {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "claim_text": {"type": "string"},
                    "claim_type": {
                        "type": "string",
                        "enum": ["target", "achievement", "commitment", "plan"]
                    },
                    "topic": {
                        "type": "string",
                        "enum": [
                            "emissions_reduction",
                            "net_zero",
                            "renewable_energy",
                            "waste_circularity",
                            "water",
                            "biodiversity",
                            "supply_chain",
                            "other",
                        ]
                    },
                    "target_year": {"type": ["integer", "null"]},
                    "baseline_year": {"type": ["integer", "null"]},
                    "numeric_value": {"type": ["number", "null"]},
                    "units": {"type": ["string", "null"]},
                    "scope_covered": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["S1", "S2", "S3"]
                        }
                    },
                    "confidence": {
                        "type": "integer",
                        "enum": [1, 2, 3]
                    }
                },
                "required": [
                    "claim_text",
                    "claim_type",
                    "topic",
                    "target_year",
                    "baseline_year",
                    "numeric_value",
                    "units",
                    "scope_covered",
                    "confidence"
                ]
            }
        }
    
    def _smart_sample_document(self, text: str, page_dict: Dict[int, str] = None) -> str:
        """
        Smart sampling: Extract strategic sections from large documents
        Improved algorithm with broader keyword matching and more inclusive sampling
        """
        # Optimized target size to avoid token limits (Gemini context + output limits)
        # With 8192 output tokens, we can afford more input
        TARGET_SIZE = 25000  # 25k chars (~6k tokens) + 8k output = ~14k total tokens
        
        if len(text) <= TARGET_SIZE:
            self.logger.info(f"Document small enough ({len(text)} chars), using full text")
            return text
        
        self.logger.info(f"Smart sampling {len(text)} char document → {TARGET_SIZE} chars")
        
        # Strategy: Take beginning + keyword-rich sections + end
        samples = []
        
        # 1. Beginning (first 8k) - usually has executive summary, key commitments
        samples.append(text[:8000])
        self.logger.info("✓ Sampled: First 8k chars (intro/executive summary)")
        
        # 2. Keyword-rich sections (middle 12k) - find paragraphs with important terms
        # Expanded keyword list for better recall
        keywords = [
            # Emissions & Climate
            'net zero', 'carbon neutral', 'climate neutral', 'carbon negative',
            'scope 1', 'scope 2', 'scope 3', 'scope1', 'scope2', 'scope3',
            'emissions', 'reduction', 'ghg', 'co2', 'tco2e', 'carbon',
            # Targets & Years
            'target', 'goal', 'commitment', 'pledge', 'ambition',
            '2025', '2030', '2035', '2040', '2045', '2050',
            'baseline', '2015', '2019', '2020', '2021', '2022', '2023', '2024',
            # Energy & Renewables
            'renewable', 'solar', 'wind', 'energy efficiency', 'clean energy',
            # Verification & Standards
            'sbti', 'science-based', 'verified', 'third-party', 'audit',
            # Progress & Achievement
            'achieved', 'progress', 'milestone', 'delivered', 'accomplished',
            # Sustainability topics
            'sustainable', 'sustainability', 'esg', 'environmental', 'climate'
        ]
        
        middle_section = text[8000:-5000] if len(text) > 13000 else text[8000:]
        
        # Split into paragraphs (more aggressive splitting)
        paragraphs = re.split(r'\n\n+|\n(?=[A-Z])', middle_section)
        
        # Score each paragraph by keyword density
        scored_paragraphs = []
        for para in paragraphs:
            if len(para) < 30:  # More lenient threshold
                continue
            para_lower = para.lower()
            score = sum(1 for kw in keywords if kw in para_lower)
            # Include paragraphs with even 1 keyword match
            if score >= 1:
                scored_paragraphs.append((score, para))
        
        # Take top paragraphs up to 12k chars
        scored_paragraphs.sort(reverse=True, key=lambda x: x[0])
        middle_sample = []
        middle_length = 0
        for score, para in scored_paragraphs:
            if middle_length + len(para) > 12000:
                break
            middle_sample.append(para)
            middle_length += len(para)
        
        if middle_sample:
            samples.append('\n\n'.join(middle_sample))
            self.logger.info(f"✓ Sampled: {len(middle_sample)} keyword-rich paragraphs ({middle_length} chars)")
        else:
            # Fallback: if no keyword matches, just take middle section
            self.logger.warning("No keyword-rich paragraphs found, taking middle section")
            samples.append(middle_section[:12000])
        
        # 3. End (last 5k) - often has commitments/forward-looking statements
        if len(text) > 13000:
            samples.append(text[-5000:])
            self.logger.info("✓ Sampled: Last 5k chars (conclusions/targets)")
        
        combined = '\n\n---\n\n'.join(samples)
        self.logger.info(f"Smart sampling complete: {len(combined)} chars from {len(text)} original")
        
        return combined

    def _segment_sampled_text(self, sampled_text: str) -> List[str]:
        """
        Break sampled text into smaller extraction segments to reduce truncated JSON
        and keep each model call focused.
        """
        if len(sampled_text) <= self.segment_target_chars:
            return [sampled_text]

        paragraphs = [
            part.strip()
            for part in re.split(r"\n\s*\n", sampled_text)
            if part.strip()
        ]
        if not paragraphs:
            return [sampled_text]

        segments: List[str] = []
        current_parts: List[str] = []
        current_len = 0

        for paragraph in paragraphs:
            paragraph_len = len(paragraph)
            separator_len = 2 if current_parts else 0

            if current_parts and current_len + separator_len + paragraph_len > self.segment_target_chars:
                segment = "\n\n".join(current_parts).strip()
                if segment:
                    segments.append(segment)

                overlap_parts: List[str] = []
                overlap_len = 0
                for existing in reversed(current_parts):
                    extra = len(existing) + (2 if overlap_parts else 0)
                    if overlap_len + extra > self.segment_overlap_chars:
                        break
                    overlap_parts.insert(0, existing)
                    overlap_len += extra

                current_parts = overlap_parts.copy()
                current_len = sum(len(part) for part in current_parts) + max(len(current_parts) - 1, 0) * 2

            current_parts.append(paragraph)
            current_len += paragraph_len + (2 if len(current_parts) > 1 else 0)

        if current_parts:
            segments.append("\n\n".join(current_parts).strip())

        return segments

    def get_document_segments(self, text: str, page_dict: Dict[int, str] | None = None) -> Dict[str, List[Dict]]:
        """
        Build reusable document segments.
        If page-level text exists, prefer page/section-aware segmentation.
        Otherwise fall back to text-only extraction batches.
        """
        if page_dict:
            return self.segmenter.build_segments(page_dict)

        sampled_text = self._smart_sample_document(text, page_dict)
        fallback_batches = []
        for index, segment_text in enumerate(self._segment_sampled_text(sampled_text), start=1):
            fallback_batches.append({
                "segment_id": f"batch-{index}",
                "segment_type": "extraction_batch",
                "title": f"Text Batch {index}",
                "page_start": None,
                "page_end": None,
                "pages": [],
                "segment_ids": [],
                "text": segment_text,
                "char_count": len(segment_text),
                "preview": segment_text[:220],
            })

        return {
            "pages": [],
            "sections": [],
            "extraction_batches": fallback_batches,
        }

    def _extract_claims_from_segment(self, segment_text: str, segment_index: int, total_segments: int) -> List[Dict]:
        prompt = get_claim_extraction_prompt(segment_text)
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=4096,
                response_mime_type="application/json",
                response_json_schema=self._claim_response_schema(),
            )
        )

        if not response or not response.text:
            self.logger.warning(
                "Gemini returned empty claim segment response",
                segment_index=segment_index,
                total_segments=total_segments,
            )
            return []

        self.logger.info(
            "Received claim extraction response",
            segment_index=segment_index,
            total_segments=total_segments,
            response_chars=len(response.text),
        )
        return self._parse_response(response.text)

    def _deduplicate_claims(self, claims: List[Dict]) -> List[Dict]:
        """
        Merge near-duplicate claims returned from overlapping extraction segments.
        Keep the more specific variant when duplicates collide.
        """
        def normalize(text: str) -> str:
            return " ".join((text or "").lower().split())

        def specificity_score(claim: Dict) -> tuple:
            return (
                claim.get("confidence", 0),
                1 if claim.get("numeric_value") is not None else 0,
                1 if claim.get("target_year") else 0,
                1 if claim.get("baseline_year") else 0,
                len(claim.get("scope_covered") or []),
                len(claim.get("claim_text", "")),
            )

        deduped: List[Dict] = []
        seen_keys: Dict[str, int] = {}

        for claim in claims:
            claim_text = claim.get("claim_text", "")
            key = normalize(claim_text)
            if not key:
                continue

            replacement_index = None
            if key in seen_keys:
                replacement_index = seen_keys[key]
            else:
                for index, existing in enumerate(deduped):
                    existing_key = normalize(existing.get("claim_text", ""))
                    if not existing_key:
                        continue
                    similarity = SequenceMatcher(None, key, existing_key).ratio()
                    if similarity >= 0.92:
                        replacement_index = index
                        break

            if replacement_index is None:
                seen_keys[key] = len(deduped)
                deduped.append(claim)
                continue

            existing = deduped[replacement_index]
            if specificity_score(claim) > specificity_score(existing):
                deduped[replacement_index] = claim
                seen_keys[key] = replacement_index
            else:
                if existing.get("page") is None and claim.get("page") is not None:
                    existing["page"] = claim["page"]

        return deduped

    def extract_claims(self, text: str, page_dict: Dict[int, str] = None) -> List[Dict]:
        """
        Extract structured environmental claims using smart sampling
        Fast approach: sample strategic sections instead of processing entire document
        """
        original_length = len(text)
        self.logger.info(f"Extracting claims from {original_length} character document")
        
        # Log first 500 chars to verify document content
        self.logger.info(f"Document preview: {text[:500]}")
        
        segment_payload = self.get_document_segments(text, page_dict)
        extraction_batches = segment_payload["extraction_batches"]

        self.logger.info(
            "Prepared claim extraction segments",
            num_segments=len(extraction_batches),
            segment_sizes=[batch["char_count"] for batch in extraction_batches],
        )
        
        try:
            all_claims: List[Dict] = []
            for index, batch in enumerate(extraction_batches, start=1):
                segment = batch["text"]
                self.logger.info(
                    "Extracting claims from segment",
                    segment_index=index,
                    total_segments=len(extraction_batches),
                    segment_chars=len(segment),
                    segment_preview=segment[:300],
                    segment_title=batch.get("title"),
                    pages=batch.get("pages"),
                )
                segment_claims = self._extract_claims_from_segment(segment, index, len(extraction_batches))
                all_claims.extend(segment_claims)

            claims_data = self._deduplicate_claims(all_claims)
            
            # Add page numbers if available
            if page_dict:
                claims_data = self._enrich_with_page_numbers(claims_data, page_dict)
            
            # Validate claims have required fields
            claims_data = self._validate_claims(claims_data)
            
            self.logger.info(
                f"Extracted {len(claims_data)} claims",
                avg_confidence=sum(c.get('confidence', 0) for c in claims_data) / len(claims_data) if claims_data else 0
            )
            return claims_data
            
        except Exception as e:
            self.logger.error("claim extraction failed", error=str(e))
            raise
    
    def _validate_claims(self, claims: List[Dict]) -> List[Dict]:
        """Validate and enhance extracted claims"""
        allowed_claim_types = {"target", "achievement", "commitment", "plan"}
        allowed_topics = {
            "emissions_reduction",
            "net_zero",
            "renewable_energy",
            "waste_circularity",
            "water",
            "biodiversity",
            "supply_chain",
            "other",
        }
        validated = []
        
        for claim in claims:
            # Ensure required fields exist
            if not claim.get("claim_text"):
                continue
            
            # Set defaults for missing fields
            claim.setdefault("claim_type", "commitment")
            claim.setdefault("topic", "other")
            claim.setdefault("confidence", 2)  # Default medium confidence
            claim.setdefault("target_year", None)
            claim.setdefault("baseline_year", None)
            claim.setdefault("scope_covered", [])
            claim.setdefault("numeric_value", None)
            claim.setdefault("units", None)

            if claim.get("claim_type") not in allowed_claim_types:
                claim["claim_type"] = "commitment"
            if claim.get("topic") not in allowed_topics:
                claim["topic"] = "other"
            
            validated.append(claim)
        
        return validated
    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """Parse Gemini response into structured claims"""
        try:
            # Handle None response
            if response_text is None:
                self.logger.error("Received None response from Gemini")
                return []
            
            # Log raw response for debugging
            self.logger.info(f"Parsing response (first 500 chars): {response_text[:500]}")
            
            # Extract JSON from response (handle markdown code blocks)
            response_text = response_text.strip()
            
            # Remove markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Try to find JSON array in the text
            # Sometimes Gemini adds explanatory text before/after JSON
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']')
            
            if start_idx == -1 or end_idx == -1:
                self.logger.error("No JSON array found in response", response_text=response_text[:1000])
                return []
            
            if end_idx <= start_idx:
                self.logger.error("Invalid JSON array indices", start=start_idx, end=end_idx)
                return []
            
            json_text = response_text[start_idx:end_idx + 1]
            self.logger.info(f"Extracted JSON (first 300 chars): {json_text[:300]}")
            
            try:
                claims = json.loads(json_text)
            except json.JSONDecodeError as e:
                # JSON might be truncated due to MAX_TOKENS - try to repair it
                self.logger.warning(f"JSON parse error, attempting to repair truncated JSON: {str(e)}")
                
                # Try to fix truncated JSON by closing it properly
                json_text_repaired = self._repair_truncated_json(json_text)
                
                try:
                    claims = json.loads(json_text_repaired)
                    self.logger.info(f"Successfully repaired and parsed truncated JSON")
                except json.JSONDecodeError as e2:
                    self.logger.error(
                        "failed to parse even after repair", 
                        error=str(e2),
                        response_preview=response_text[:1000]
                    )
                    return []
            
            if not isinstance(claims, list):
                self.logger.warning("Response is not a list, returning empty")
                return []
            
            self.logger.info(f"Successfully parsed {len(claims)} claims from response")
            return claims
            
        except json.JSONDecodeError as e:
            self.logger.error(
                "failed to parse JSON response", 
                error=str(e), 
                error_pos=e.pos if hasattr(e, 'pos') else None,
                response_preview=response_text[:1000]
            )
            return []
    
    def _repair_truncated_json(self, json_text: str) -> str:
        """
        Attempt to repair truncated JSON array by closing incomplete objects
        """
        # Find the last complete object by looking for the last "},"
        last_complete = json_text.rfind('},')
        
        if last_complete == -1:
            # No complete objects, return empty array
            return '[]'
        
        # Truncate at the last complete object and close the array
        repaired = json_text[:last_complete + 1] + '\n]'
        
        self.logger.info(f"Repaired JSON by truncating at last complete object (position {last_complete})")
        return repaired
    
    def _enrich_with_page_numbers(self, claims: List[Dict], page_dict: Dict[int, str]) -> List[Dict]:
        """Add page numbers to claims by matching text"""
        def normalize(text: str) -> str:
            return " ".join((text or "").split()).lower()

        for claim in claims:
            claim_text = claim.get("claim_text", "")
            claim_norm = normalize(claim_text)
            if not claim_norm:
                claim["page"] = None
                continue

            claim_start = claim_norm[:80]
            claim_end = claim_norm[-40:] if len(claim_norm) > 40 else claim_norm

            best_page = None
            best_score = 0.0

            # Find which page contains this claim
            for page_num, page_text in page_dict.items():
                page_norm = normalize(page_text)
                if not page_norm:
                    continue

                if claim_norm in page_norm or claim_start in page_norm:
                    claim["page"] = page_num
                    break

                score = 0.0
                if claim_start and claim_start in page_norm:
                    score += 3.0
                if claim_end and claim_end in page_norm:
                    score += 2.0

                if score == 0.0:
                    similarity = SequenceMatcher(
                        None,
                        claim_norm[: min(len(claim_norm), 120)],
                        page_norm[: min(len(page_norm), 400)]
                    ).ratio()
                    score += similarity

                if score > best_score:
                    best_score = score
                    best_page = page_num

            if "page" not in claim:
                claim["page"] = best_page if best_score >= 1.0 else None

            if claim.get("page") is None:
                claim["page"] = None
        
        return claims
