from __future__ import annotations

from typing import Dict, List, Optional
import re
import structlog


logger = structlog.get_logger()


class DocumentSegmentationService:
    """
    Build reusable page/section-aware segments from extracted PDF text.
    The same structure is used for claim extraction and can be exposed to the UI.
    """

    def __init__(self):
        self.logger = logger.bind(service="document_segmentation")
        self.batch_target_chars = 6500
        self.batch_overlap_chars = 500
        self.section_keywords = {
            "climate",
            "carbon",
            "emission",
            "emissions",
            "ghg",
            "scope",
            "renewable",
            "energy",
            "waste",
            "recycling",
            "diversion",
            "packaging",
            "water",
            "biodiversity",
            "nature",
            "forest",
            "supplier",
            "supply chain",
            "environment",
            "sustainability",
            "target",
            "goal",
            "net zero",
            "sbti",
            "science based",
            "decarbonization",
            "electricity",
        }
        self.ignored_heading_exact = {
            "contents",
            "overview",
            "progress",
            "appendix",
            "introduction",
            "2024 sustainability report",
        }
        self.ignored_heading_prefixes = (
            "photo:",
            "source:",
            "learn more",
            "contents introduction",
            "overview progress appendix",
        )
        self.generic_heading_keywords = {
            "contents",
            "overview",
            "progress",
            "appendix",
            "introduction",
            "photo",
            "governance",
        }

    def build_segments(self, page_dict: Dict[int, str]) -> Dict[str, List[Dict]]:
        page_segments = self._build_page_segments(page_dict)
        section_segments = self._build_section_segments(page_dict)
        extraction_batches = self._build_extraction_batches(section_segments or page_segments)

        self.logger.info(
            "Built document segments",
            pages=len(page_segments),
            sections=len(section_segments),
            extraction_batches=len(extraction_batches),
        )

        return {
            "pages": page_segments,
            "sections": section_segments,
            "extraction_batches": extraction_batches,
        }

    def _build_page_segments(self, page_dict: Dict[int, str]) -> List[Dict]:
        page_segments = []
        for page_num, page_text in sorted(page_dict.items()):
            cleaned = (page_text or "").strip()
            if not cleaned:
                continue
            page_segments.append({
                "segment_id": f"page-{page_num}",
                "segment_type": "page",
                "title": f"Page {page_num}",
                "page_start": page_num,
                "page_end": page_num,
                "pages": [page_num],
                "text": cleaned,
                "char_count": len(cleaned),
                "preview": cleaned[:220],
            })
        return page_segments

    def _build_section_segments(self, page_dict: Dict[int, str]) -> List[Dict]:
        sections: List[Dict] = []
        current_section: Optional[Dict] = None

        for page_num, page_text in sorted(page_dict.items()):
            if not page_text:
                continue

            lines = [line.strip() for line in page_text.splitlines() if line.strip()]
            for line in lines:
                if self._looks_like_heading(line):
                    if current_section and current_section["lines"]:
                        sections.append(self._finalize_section(current_section))

                    current_section = {
                        "title": self._clean_heading(line),
                        "page_start": page_num,
                        "page_end": page_num,
                        "pages": [page_num],
                        "lines": [],
                    }
                    continue

                if current_section is None:
                    current_section = {
                        "title": f"Page {page_num} Overview",
                        "page_start": page_num,
                        "page_end": page_num,
                        "pages": [page_num],
                        "lines": [],
                    }

                current_section["lines"].append(line)
                current_section["page_end"] = page_num
                if page_num not in current_section["pages"]:
                    current_section["pages"].append(page_num)

        if current_section and current_section["lines"]:
            sections.append(self._finalize_section(current_section))

        # Filter tiny/noisy sections and de-duplicate repeated headings.
        filtered: List[Dict] = []
        seen = set()
        for section in sections:
            key = (section["title"].lower(), tuple(section["pages"]), section["preview"].lower())
            if not self._is_kept_section(section):
                continue
            if key in seen:
                continue
            seen.add(key)
            filtered.append(section)

        return filtered

    def _build_extraction_batches(self, segments: List[Dict]) -> List[Dict]:
        if not segments:
            return []

        batches: List[Dict] = []
        current_segments: List[Dict] = []
        current_chars = 0

        for segment in segments:
            segment_chars = len(segment["text"])
            separator_chars = 2 if current_segments else 0

            if current_segments and current_chars + separator_chars + segment_chars > self.batch_target_chars:
                batches.append(self._finalize_batch(current_segments, len(batches) + 1))
                current_segments = self._overlap_segments(current_segments)
                current_chars = sum(len(item["text"]) for item in current_segments) + max(len(current_segments) - 1, 0) * 2

            current_segments.append(segment)
            current_chars += segment_chars + (2 if len(current_segments) > 1 else 0)

        if current_segments:
            batches.append(self._finalize_batch(current_segments, len(batches) + 1))

        return batches

    def _overlap_segments(self, segments: List[Dict]) -> List[Dict]:
        overlap: List[Dict] = []
        overlap_chars = 0
        for segment in reversed(segments):
            extra = len(segment["text"]) + (2 if overlap else 0)
            if overlap_chars + extra > self.batch_overlap_chars:
                break
            overlap.insert(0, segment)
            overlap_chars += extra
        return overlap

    def _finalize_section(self, raw_section: Dict) -> Dict:
        text = "\n".join(raw_section["lines"]).strip()
        title = raw_section["title"]
        page_start = raw_section["page_start"]
        page_end = raw_section["page_end"]
        return {
            "segment_id": f"section-{page_start}-{page_end}-{self._slugify(title)}",
            "segment_type": "section",
            "title": title,
            "page_start": page_start,
            "page_end": page_end,
            "pages": raw_section["pages"],
            "text": text,
            "char_count": len(text),
            "preview": text[:220],
        }

    def _finalize_batch(self, segments: List[Dict], batch_index: int) -> Dict:
        titles = [segment["title"] for segment in segments]
        unique_titles = []
        for title in titles:
            if title not in unique_titles:
                unique_titles.append(title)

        pages = []
        for segment in segments:
            for page in segment["pages"]:
                if page not in pages:
                    pages.append(page)

        text_parts = [
            f"[{segment['title']} | pages {segment['page_start']}-{segment['page_end']}]\n{segment['text']}"
            for segment in segments
        ]
        text = "\n\n".join(text_parts)
        title = " / ".join(unique_titles[:3])
        if len(unique_titles) > 3:
            title += " / ..."

        return {
            "segment_id": f"batch-{batch_index}",
            "segment_type": "extraction_batch",
            "title": title,
            "page_start": min(pages) if pages else None,
            "page_end": max(pages) if pages else None,
            "pages": pages,
            "segment_ids": [segment["segment_id"] for segment in segments],
            "text": text,
            "char_count": len(text),
            "preview": text[:220],
        }

    def _looks_like_heading(self, line: str) -> bool:
        cleaned = self._clean_heading(line)
        if not cleaned:
            return False
        if self._is_ignored_heading(cleaned):
            return False
        if len(cleaned) > 90 or len(cleaned) < 4:
            return False
        if cleaned.endswith((".", ":", ";", ",")):
            return False
        if re.search(r"https?://|www\.", cleaned.lower()):
            return False
        if re.search(r"\bpage \d+\b", cleaned.lower()):
            return False

        words = cleaned.split()
        if len(words) > 8:
            return False
        if len(words) == 1 and cleaned.lower() not in self.section_keywords:
            return False

        alpha_words = [word for word in words if re.search(r"[A-Za-z]", word)]
        if not alpha_words:
            return False

        uppercase_ratio = sum(1 for word in alpha_words if word[:1].isupper()) / len(alpha_words)
        lowercase_ratio = sum(1 for word in alpha_words if word[:1].islower()) / len(alpha_words)
        if lowercase_ratio > 0.3:
            return False
        if re.search(r"\b(is|are|was|were|have|has|had|will|would|can|could|should)\b", cleaned.lower()):
            return False
        if cleaned.isupper() or uppercase_ratio >= 0.6:
            return True

        cleaned_lower = cleaned.lower()
        if cleaned_lower in self.section_keywords:
            return True
        if uppercase_ratio >= 0.9 and len(words) <= 6:
            return True

        return False

    def _is_ignored_heading(self, cleaned_heading: str) -> bool:
        lowered = cleaned_heading.lower()
        if lowered in self.ignored_heading_exact:
            return True
        if any(lowered.startswith(prefix) for prefix in self.ignored_heading_prefixes):
            return True
        if re.fullmatch(r"\d{4}", lowered):
            return True
        if re.search(r"^\d+\s", lowered):
            return True
        if lowered.count("contents") >= 1 and len(lowered.split()) > 3:
            return True
        return False

    def _section_relevance_score(self, section: Dict) -> int:
        title = section["title"].lower()
        text = section["text"].lower()
        score = 0

        for keyword in self.section_keywords:
            if keyword in title:
                score += 3
            if keyword in text:
                score += 1

        if re.search(r"\b20\d{2}\b", text):
            score += 1
        if re.search(r"\d+(?:\.\d+)?%", text):
            score += 1
        if re.search(r"\b(scope 1|scope 2|scope 3|net zero|sbti)\b", text):
            score += 2
        return score

    def _is_kept_section(self, section: Dict) -> bool:
        title = section["title"].lower()
        text = section["text"].lower()
        score = self._section_relevance_score(section)

        if section["char_count"] < 180:
            return False
        if self._is_ignored_heading(section["title"]):
            return False
        if title in self.generic_heading_keywords and score < 3:
            return False
        if "sustainability report" in title and score < 4:
            return False
        if "photo:" in text[:80]:
            return False
        if score == 0:
            return False
        return True

    def _clean_heading(self, line: str) -> str:
        cleaned = re.sub(r"\s+", " ", (line or "").strip())
        cleaned = re.sub(r"\s+\d+$", "", cleaned)
        cleaned = re.sub(r"^[\W_]+|[\W_]+$", "", cleaned)
        return cleaned.strip(" -")

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
        return slug or "segment"
