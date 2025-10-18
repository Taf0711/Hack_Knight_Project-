from typing import List, Dict
import json
from google import genai
from google.genai import types
import structlog
from config import GEMINI_API_KEY
import os

logger = structlog.get_logger()


class ClaimExtractor:
    """Extract environmental claims from documents using Gemini"""
    
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"
        self.logger = logger.bind(service="claim_extractor")
    
    def extract_claims(self, text: str, page_dict: Dict[int, str] = None) -> List[Dict]:
        """
        Extract structured environmental claims from text
        Returns list of claim dictionaries
        """
        prompt = self._build_extraction_prompt(text)
        
        try:
            # Create structured content
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )
            ]
            
            # Configure generation
            generate_config = types.GenerateContentConfig(
                temperature=0.1,  # Low temperature for consistent structured output
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
            )
            
            # Generate content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=generate_config
            )
            
            claims_data = self._parse_response(response.text)
            
            # Add page numbers if available
            if page_dict:
                claims_data = self._enrich_with_page_numbers(claims_data, page_dict)
            
            self.logger.info(f"Extracted {len(claims_data)} claims")
            return claims_data
            
        except Exception as e:
            self.logger.error("claim extraction failed", error=str(e))
            raise
    
    def _build_extraction_prompt(self, text: str) -> str:
        """Build the prompt for claim extraction"""
        return f"""You are an expert environmental analyst. Extract all environmental and sustainability claims from the following document.

For each claim, identify:
1. claim_text: The exact claim being made
2. claim_type: One of ["target", "achievement", "plan", "offset", "commitment"]
3. topic: One of ["net_zero", "scope1", "scope2", "scope3", "renewable", "emissions_reduction", "carbon_neutral", "water", "waste", "biodiversity", "other"]
4. target_year: Year the target should be achieved (if mentioned)
5. baseline_year: Baseline year for comparison (if mentioned)
6. scope_covered: Array of emission scopes covered (e.g., ["S1", "S2", "S3"])
7. numeric_value: Any numeric value mentioned (e.g., 50 for "50% reduction")
8. units: Units of the numeric value (e.g., "%", "tCO2e", "MWh")

Return ONLY a valid JSON array of claims, nothing else. Format:
[
  {{
    "claim_text": "...",
    "claim_type": "...",
    "topic": "...",
    "target_year": 2030,
    "baseline_year": 2020,
    "scope_covered": ["S1", "S2"],
    "numeric_value": 50.0,
    "units": "%"
  }}
]

If no claims found, return an empty array: []

Document text:
{text[:15000]}
"""
    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """Parse Gemini response into structured claims"""
        try:
            # Extract JSON from response (handle markdown code blocks)
            response_text = response_text.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            claims = json.loads(response_text)
            
            if not isinstance(claims, list):
                self.logger.warning("Response is not a list, returning empty")
                return []
            
            return claims
            
        except json.JSONDecodeError as e:
            self.logger.error("failed to parse JSON response", error=str(e))
            return []
    
    def _enrich_with_page_numbers(self, claims: List[Dict], page_dict: Dict[int, str]) -> List[Dict]:
        """Add page numbers to claims by matching text"""
        for claim in claims:
            claim_text = claim.get("claim_text", "")
            
            # Find which page contains this claim
            for page_num, page_text in page_dict.items():
                if claim_text[:50] in page_text:  # Match first 50 chars
                    claim["page"] = page_num
                    break
            
            if "page" not in claim:
                claim["page"] = None
        
        return claims

