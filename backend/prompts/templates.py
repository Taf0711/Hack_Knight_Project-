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
    return f"""You are an expert sustainability analyst. Extract ALL significant environmental and climate-related claims from this document.

WHAT TO EXTRACT:
✓ Emissions reduction targets or achievements (any scope)
✓ Net zero, carbon neutral, or climate neutral commitments
✓ Renewable energy goals or progress
✓ Water, waste, or circular economy targets
✓ Science-based targets (SBTi) commitments
✓ Sustainability goals with timelines
✓ Environmental achievements with data
✓ Climate action plans and roadmaps

IMPORTANT: Extract BOTH specific claims (with numbers) AND general commitments (without specific numbers).
Cast a wide net - it's better to extract more claims than to miss important ones.

OUTPUT FORMAT - Return ONLY valid JSON array (no other text):
[{{
  "claim_text": "exact claim from document (copy verbatim)",
  "claim_type": "target" | "achievement" | "commitment" | "plan",
  "topic": "emissions_reduction" | "net_zero" | "renewable_energy" | "other",
  "target_year": year or null,
  "baseline_year": year or null,
  "numeric_value": number or null,
  "units": "%" | "tCO2e" | "MWh" | "GWh" | "tonnes" | null,
  "scope_covered": ["S1", "S2", "S3"] or [],
  "confidence": 1 (vague) | 2 (moderate) | 3 (specific with data)
}}]

EXAMPLES:
- "We reduced emissions by 25% from 2019 baseline" → confidence: 3
- "We commit to net zero by 2050" → confidence: 2
- "We are committed to sustainability" → confidence: 1

DOCUMENT TEXT:
{text}

Extract ALL environmental claims now as JSON array:"""


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

STRUCTURED REASONING FRAMEWORK:

1. UNDERSTANDING
   What is this claim specifically asserting? What evidence would prove or disprove it?

2. EVIDENCE REVIEW
   Which passages are directly relevant? What specific data or facts do they provide?

3. CONSISTENCY CHECK
   Do passages contradict each other? Are there gaps or missing information?

4. GREENWASHING SIGNALS
   - Is the language specific or vague?
   - Are numbers, baselines, and methodologies provided?
   - Is the scope comprehensive (including Scope 3)?
   - Are there hidden qualifications or limitations?
   - Is there transparency about methodology and verification?

5. VERDICT
   Based on the evidence, does it SUPPORT, CONTRADICT, or is it INSUFFICIENT?

OUTPUT FORMAT (return ONLY valid JSON):
{{
  "reasoning_steps": [
    "Step 1: Understanding - ...",
    "Step 2: Evidence review - ...",
    "Step 3: Consistency check - ...",
    "Step 4: Greenwashing signals - ...",
    "Step 5: Verdict - ..."
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
- cited_passages: Indices of passages that support your analysis

Return ONLY the JSON object, no other text.
"""

