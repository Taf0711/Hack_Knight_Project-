from typing import List, Dict
import json
from google import genai
from google.genai import types
import structlog
from config import GEMINI_API_KEY
import os

logger = structlog.get_logger()


class EvidenceAnalyzer:
    """Analyze claims and find supporting/contradicting evidence"""
    
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"
        self.logger = logger.bind(service="evidence_analyzer")
    
    def analyze_claim(self, claim_text: str, context_passages: List[Dict]) -> Dict:
        """
        Analyze a single claim against context passages
        Returns evidence analysis with stance and rationale
        """
        prompt = self._build_analysis_prompt(claim_text, context_passages)
        
        try:
            # Create structured content
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )
            ]
            
            # Configure generation for deeper analysis
            generate_config = types.GenerateContentConfig(
                temperature=0.2,  # Slightly higher for nuanced analysis
                top_p=0.95,
                top_k=40,
                max_output_tokens=4096,
            )
            
            # Generate content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=generate_config
            )
            
            evidence = self._parse_response(response.text, context_passages)
            
            self.logger.info(f"Analyzed claim: {claim_text[:50]}...")
            return evidence
            
        except Exception as e:
            self.logger.error("evidence analysis failed", error=str(e))
            # Return default insufficient evidence
            return {
                "stance": "insufficient",
                "strength": 0,
                "rationale": f"Analysis failed: {str(e)}",
                "citations": []
            }
    
    def _build_analysis_prompt(self, claim_text: str, passages: List[Dict]) -> str:
        """Build prompt for evidence analysis"""
        context = self._format_passages(passages)
        
        return f"""You are an expert fact-checker analyzing environmental claims for potential greenwashing.

Claim to analyze:
"{claim_text}"

Available evidence from the source document:
{context}

Task: Evaluate whether the evidence SUPPORTS, CONTRADICTS, or is INSUFFICIENT to validate this claim.

Consider:
1. Is there concrete data backing the claim?
2. Are baselines and methodologies clearly stated?
3. Are there qualifications or limitations mentioned?
4. Is the claim specific or vague?
5. Are there any contradictions in the document?

Return ONLY a valid JSON object with this structure:
{{
  "stance": "supports" | "contradicts" | "insufficient",
  "strength": 0-3,
  "rationale": "Brief explanation (2-3 sentences)",
  "cited_passages": [0, 1, 2]
}}

Where:
- stance: Your assessment of how the evidence relates to the claim
- strength: 0=no evidence, 1=weak, 2=moderate, 3=strong
- rationale: Clear explanation of your reasoning
- cited_passages: Array of passage indices that support your assessment

Return ONLY the JSON, no other text.
"""
    
    def _format_passages(self, passages: List[Dict]) -> str:
        """Format passages for the prompt"""
        formatted = []
        for i, passage in enumerate(passages):
            page = passage.get("page", "?")
            text = passage.get("text", "")
            formatted.append(f"[Passage {i}, Page {page}]\n{text}")
        
        return "\n\n---\n\n".join(formatted)
    
    def _parse_response(self, response_text: str, passages: List[Dict]) -> Dict:
        """Parse Gemini response into structured evidence"""
        try:
            # Extract JSON from response
            response_text = response_text.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            data = json.loads(response_text)
            
            # Build citations from cited passages
            citations = []
            cited_indices = data.get("cited_passages", [])
            
            for idx in cited_indices:
                if 0 <= idx < len(passages):
                    passage = passages[idx]
                    citations.append({
                        "page": passage.get("page"),
                        "snippet": passage.get("text", "")[:200] + "...",
                        "document_id": str(passage.get("document_id", ""))
                    })
            
            return {
                "stance": data.get("stance", "insufficient"),
                "strength": data.get("strength", 0),
                "rationale": data.get("rationale", ""),
                "citations": citations
            }
            
        except json.JSONDecodeError as e:
            self.logger.error("failed to parse evidence response", error=str(e))
            return {
                "stance": "insufficient",
                "strength": 0,
                "rationale": "Failed to parse analysis",
                "citations": []
            }

