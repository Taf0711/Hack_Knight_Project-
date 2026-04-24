"""
Centralized prompt templates for consistent AI behavior
"""

# Few-shot examples for claim extraction
CLAIM_EXTRACTION_EXAMPLES = [
    {
        "text": "We reduced Scope 1 and 2 emissions by 30% from 2019 baseline by 2023, from 10,000 to 7,000 tCO2e.",
        "output": {
            "claim_text": "We reduced Scope 1 and 2 emissions by 30% from 2019 baseline by 2023",
            "claim_type": "achievement",
            "topic": "emissions_reduction",
            "numeric_value": 30.0,
            "units": "%",
            "baseline_year": 2019,
            "target_year": 2023,
            "scope_covered": ["S1", "S2"],
            "confidence": 3
        }
    },
    {
        "text": "We commit to achieving net zero by 2050 across all scopes.",
        "output": {
            "claim_text": "We commit to achieving net zero by 2050 across all scopes",
            "claim_type": "target",
            "topic": "net_zero",
            "target_year": 2050,
            "scope_covered": ["S1", "S2", "S3"],
            "confidence": 2
        }
    },
    {
        "text": "Our products are eco-friendly and sustainable.",
        "output": {
            "claim_text": "Our products are eco-friendly and sustainable",
            "claim_type": "commitment",
            "topic": "other",
            "confidence": 1
        }
    }
]


def format_claim_examples():
    """Format few-shot examples for the prompt"""
    formatted = []
    for i, example in enumerate(CLAIM_EXTRACTION_EXAMPLES, 1):
        formatted.append(f"Example {i}:")
        formatted.append(f"Text: \"{example['text']}\"")
        formatted.append(f"Output: {example['output']}")
        formatted.append("")
    return "\n".join(formatted)


CLAIM_EXTRACTION_NON_EXAMPLES = [
    {
        "text": "We are pleased to present our fifteenth sustainability report.",
        "reason": "Report meta statement, not an environmental claim.",
    },
    {
        "text": "In 2024, we made significant progress in our environmental stewardship.",
        "reason": "Generic progress language without a concrete target, metric, or verified outcome.",
    },
    {
        "text": "Our commitment to sustainability is unwavering.",
        "reason": "Brand or values language without an auditable assertion.",
    },
]


def format_claim_non_examples():
    """Format negative examples for the prompt"""
    formatted = []
    for i, example in enumerate(CLAIM_EXTRACTION_NON_EXAMPLES, 1):
        formatted.append(f"Do NOT extract example {i}:")
        formatted.append(f"Text: \"{example['text']}\"")
        formatted.append(f"Reason: {example['reason']}")
        formatted.append("")
    return "\n".join(formatted)


# Greenwashing red flags
GREENWASHING_RED_FLAGS = [
    "Vague language without specifics (\"eco-friendly\", \"green\", \"sustainable\" without metrics)",
    "Missing baselines or comparison points",
    "Cherry-picked data or limited scope (excluding Scope 3)",
    "Heavy reliance on carbon offsets vs. direct emissions reductions",
    "Aspirational targets without concrete plans or interim milestones",
    "Lack of third-party verification or transparent methodology",
    "Focus on intensity metrics only (per unit) without absolute reduction",
    "Claims about future targets without progress reports on current performance"
]


def get_document_summary_prompt(text: str) -> str:
    """Stage 1: Extract key environmental sections from entire document"""
    return f"""Extract paragraphs with environmental claims, targets, or numbers.

Focus on:
- Numbers: emissions, %, reductions
- Years: targets, baselines
- Commitments: net zero, carbon neutral
- Scopes: 1, 2, 3
- Progress updates

Return ONLY relevant paragraphs preserving exact wording.

TEXT:
{text}"""


def get_claim_extraction_prompt(text: str) -> str:
    """Extract structured claims from sampled document text"""
    examples = format_claim_examples()
    non_examples = format_claim_non_examples()
    return f"""You are an expert sustainability analyst. Extract auditable environmental and climate-related claims from this document.

WHAT TO EXTRACT:
✓ Emissions reduction targets or achievements (any scope)
✓ Net zero, carbon neutral, or climate neutral commitments
✓ Renewable energy goals or progress
✓ Water, waste, or circular economy targets
✓ Science-based targets (SBTi) commitments
✓ Sustainability goals with timelines
✓ Environmental achievements with data
✓ Climate action plans and roadmaps

IMPORTANT:
- Extract BOTH specific claims (with numbers) AND forward-looking commitments that contain a concrete target, scope, methodology, or timeline.
- Prefer precision over volume. It is better to return fewer high-quality claims than to include generic sustainability prose.
- If the same fact appears multiple times, keep only the most specific version.

ONLY EXTRACT SUBSTANTIVE CLAIMS:
- Prefer complete sentences or sentence fragments that make an auditable assertion.
- Keep the wording verbatim from the document, but do not return page furniture, table-of-contents labels, navigation text, or isolated headings.
- Do NOT extract standalone assurance titles, appendix labels, section names, or topic headers unless they contain an actual factual or forward-looking environmental claim.
- Do NOT extract generic fragments like "waste and circularity" or "Amazon Scope 3 Assurance" unless surrounding text states what was assured, measured, achieved, or committed.
- If a statement is purely descriptive branding language with no environmental assertion, skip it.
- When a claim includes a metric, year, baseline, scope, or methodology, preserve that detail in the claim text.
- Do NOT extract report meta statements, introductory framing, or generic progress language such as:
  - "we are pleased to present this report"
  - "we made significant progress"
  - "our commitment is unwavering"
  unless the same sentence also contains a concrete environmental target, metric, validation result, or named action.
- Do NOT extract a vague wrapper sentence if the next sentence contains the measurable claim. Extract the measurable claim instead.

OUTPUT FORMAT - Return ONLY valid JSON array (no other text):
[{{
  "claim_text": "exact claim from document (copy verbatim)",
  "claim_type": "target" | "achievement" | "commitment" | "plan",
  "topic": "emissions_reduction" | "net_zero" | "renewable_energy" | "waste_circularity" | "water" | "biodiversity" | "supply_chain" | "other",
  "target_year": year or null,
  "baseline_year": year or null,
  "numeric_value": number or null,
  "units": exact unit string from document or null,
  "scope_covered": ["S1", "S2", "S3"] or [],
  "confidence": 1 (vague) | 2 (moderate) | 3 (specific with data)
}}]

TOPIC MAPPING:
- Emissions, carbon, greenhouse gas, Scope 1/2/3 -> "emissions_reduction" or "net_zero"
- Renewable electricity, power purchase agreements, solar, wind -> "renewable_energy"
- Waste, recycling, diversion, packaging circularity -> "waste_circularity"
- Water efficiency, water replenishment, wastewater -> "water"
- Nature, forests, biodiversity, habitat restoration -> "biodiversity"
- Supplier emissions, supplier renewable energy, supply-chain commitments -> "supply_chain"
- If nothing fits cleanly -> "other"

CONFIDENCE GUIDANCE:
- 3: specific metric, target, baseline, scope, validation, or named project
- 2: concrete claim with some specificity but missing one or more key details
- 1: still an environmental claim, but too vague to verify strongly

POSITIVE EXAMPLES:
{examples}

NEGATIVE EXAMPLES:
{non_examples}

DOCUMENT TEXT:
{text}

Return ONLY the JSON array now:"""


def get_evidence_analysis_prompt(claim_text: str, passages: list) -> str:
    """Generate structured evidence analysis prompt"""
    
    formatted_passages = []
    for i, passage in enumerate(passages):
        page = passage.get("page", "?")
        text = passage.get("text", "")
        formatted_passages.append(f"[Passage {i}, Page {page}]\n{text}")
    
    context = "\n\n---\n\n".join(formatted_passages)
    
    return f"""You are an expert fact-checker analyzing environmental claims for potential greenwashing.

CLAIM TO ANALYZE:
"{claim_text}"

AVAILABLE EVIDENCE FROM SOURCE DOCUMENT:
{context}

ASSESSMENT RULES:
- Focus on whether the passages support, contradict, or fail to support the exact claim.
- Prefer passages with the same metric, date, baseline, scope, and named initiative as the claim.
- Distinguish contradiction from temporal drift. "As of today" versus "year-end 2024" is not a contradiction unless they claim the same timestamp.
- Ignore weakly related sustainability passages that do not bear on the claim directly.
- Keep reasoning concise. Use short factual steps, not long essays.

OUTPUT FORMAT (return ONLY valid JSON):
{{
  "reasoning_steps": [
    "Short step 1",
    "Short step 2",
    "Short step 3"
  ],
  "stance": "supports" | "contradicts" | "insufficient",
  "strength": 0 | 1 | 2 | 3,
  "confidence": 0 | 1 | 2 | 3,
  "rationale": "2-3 sentence summary of your assessment",
  "cited_passages": [0, 1, 2]
}}

Where:
- stance: Your assessment (supports/contradicts/insufficient)
- strength: 0=no evidence, 1=weak, 2=moderate, 3=strong
- confidence: 0=very uncertain, 1=somewhat uncertain, 2=moderately certain, 3=highly certain
- rationale: Clear, concise explanation
- cited_passages: Indices of directly relevant passages only. Cite the minimum set needed to justify the verdict.

Return ONLY the JSON object, no other text.
"""
