from typing import List, Dict
import json
from google import genai
from google.genai import types
import structlog
from config import GEMINI_API_KEY
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from prompts.templates import get_evidence_analysis_prompt
from utils.grounding import validate_citations

logger = structlog.get_logger()


class EvidenceAnalyzer:
    """Analyze claims and find supporting/contradicting evidence"""
    
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"
        self.logger = logger.bind(service="evidence_analyzer")

    def _evidence_response_schema(self) -> Dict:
        return {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "reasoning_steps": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "stance": {
                    "type": "string",
                    "enum": ["supports", "contradicts", "insufficient"]
                },
                "strength": {
                    "type": "integer",
                    "enum": [0, 1, 2, 3]
                },
                "confidence": {
                    "type": "integer",
                    "enum": [0, 1, 2, 3]
                },
                "rationale": {"type": "string"},
                "cited_passages": {
                    "type": "array",
                    "items": {"type": "integer"}
                }
            },
            "required": [
                "reasoning_steps",
                "stance",
                "strength",
                "confidence",
                "rationale",
                "cited_passages"
            ]
        }
    
    def analyze_claim(self, claim_text: str, context_passages: List[Dict]) -> Dict:
        """
        Analyze a single claim against context passages with structured reasoning
        Returns evidence analysis with stance, confidence, reasoning steps, and validated citations
        """
        # Use enhanced prompt with structured reasoning framework
        prompt = get_evidence_analysis_prompt(claim_text, context_passages)
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                    response_json_schema=self._evidence_response_schema(),
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=4096,
                    ),
                )
            )
            
            # Check if response is valid
            if not response or not response.text:
                self.logger.error("Gemini returned empty response")
                return {
                    "stance": "insufficient",
                    "strength": 0,
                    "confidence": 0,
                    "rationale": "No response from API",
                    "reasoning_steps": [],
                    "citations": []
                }
            
            evidence = self._parse_response(response.text, context_passages)
            
            # Validate citations to detect hallucinations
            if evidence.get("citations"):
                evidence["citations"] = validate_citations(
                    evidence["citations"],
                    context_passages
                )
            
            self.logger.info(
                f"Analyzed claim: {claim_text[:50]}...",
                stance=evidence.get("stance"),
                confidence=evidence.get("confidence"),
                num_citations=len(evidence.get("citations", []))
            )
            return evidence
            
        except Exception as e:
            self.logger.error("evidence analysis failed", error=str(e))
            # Return default insufficient evidence
            return {
                "stance": "insufficient",
                "strength": 0,
                "confidence": 0,
                "rationale": f"Analysis failed: {str(e)}",
                "reasoning_steps": [],
                "citations": []
            }
    
    
    def _parse_response(self, response_text: str, passages: List[Dict]) -> Dict:
        """Parse Gemini response into structured evidence"""
        try:
            # Handle None response
            if response_text is None:
                self.logger.error("Received None response from Gemini")
                return {
                    "stance": "insufficient",
                    "strength": 0,
                    "confidence": 0,
                    "rationale": "No response received from AI",
                    "reasoning_steps": [],
                    "citations": []
                }
            
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
            
            # Build citations from cited passages with longer context
            citations = []
            cited_indices = data.get("cited_passages", [])
            
            for idx in cited_indices:
                if 0 <= idx < len(passages):
                    passage = passages[idx]
                    # Keep an exact contiguous substring so validation can verify it.
                    snippet = (passage.get("text", "") or "")[:240].strip()
                    
                    citations.append({
                        "passage_id": str(passage.get("id", "")),
                        "page": passage.get("page"),
                        "snippet": snippet,
                        "document_id": str(passage.get("document_id", ""))
                    })
            
            return {
                "stance": data.get("stance", "insufficient"),
                "strength": data.get("strength", 0),
                "confidence": data.get("confidence", 0),  # Add confidence field
                "rationale": data.get("rationale", ""),
                "reasoning_steps": data.get("reasoning_steps", []),  # Add reasoning steps
                "citations": citations
            }
            
        except json.JSONDecodeError as e:
            self.logger.error("failed to parse evidence response", error=str(e))
            return {
                "stance": "insufficient",
                "strength": 0,
                "confidence": 0,
                "rationale": "Failed to parse analysis",
                "reasoning_steps": [],
                "citations": []
            }
