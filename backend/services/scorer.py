from typing import List, Dict, Tuple
import structlog

logger = structlog.get_logger()


class ClaimScorer:
    """Score claims across multiple dimensions and calculate traffic-light rating"""
    
    def __init__(self):
        self.logger = logger.bind(service="scorer")
    
    def score_claim(
        self,
        claim: Dict,
        evidence_list: List[Dict]
    ) -> Tuple[List[Dict], str]:
        """
        Score a claim across multiple dimensions
        Returns: (scores_list, overall_rating)
        """
        scores = []
        
        # Score each dimension
        integrity_score = self._score_integrity(claim, evidence_list)
        scores.append(integrity_score)
        
        verifiability_score = self._score_verifiability(claim, evidence_list)
        scores.append(verifiability_score)
        
        scope_coverage_score = self._score_scope_coverage(claim)
        scores.append(scope_coverage_score)
        
        offset_dependency_score = self._score_offset_dependency(claim, evidence_list)
        scores.append(offset_dependency_score)
        
        # Calculate overall rating
        overall_rating = self._calculate_overall_rating(scores)
        
        self.logger.info(f"Scored claim with rating: {overall_rating}")
        return scores, overall_rating
    
    def _score_integrity(self, claim: Dict, evidence_list: List[Dict]) -> Dict:
        """
        Score claim integrity based on evidence stance and strength
        """
        if not evidence_list:
            return {
                "dimension": "integrity",
                "value": 0.0,
                "explanation": "No evidence available to assess claim integrity"
            }
        
        # Aggregate evidence
        supporting = [e for e in evidence_list if e.get("stance") == "supports"]
        contradicting = [e for e in evidence_list if e.get("stance") == "contradicts"]
        
        if contradicting:
            value = 20.0
            explanation = f"Found {len(contradicting)} contradicting evidence. Claim integrity is questionable."
        elif supporting:
            avg_strength = sum(e.get("strength", 0) for e in supporting) / len(supporting)
            value = min(100.0, avg_strength * 33.33)  # Convert 0-3 to 0-100
            explanation = f"Found {len(supporting)} supporting evidence with average strength {avg_strength:.1f}/3."
        else:
            value = 40.0
            explanation = "Evidence is insufficient to validate or contradict the claim."
        
        return {
            "dimension": "integrity",
            "value": value,
            "explanation": explanation
        }
    
    def _score_verifiability(self, claim: Dict, evidence_list: List[Dict]) -> Dict:
        """
        Score how verifiable the claim is (specific data, baselines, methodologies)
        """
        score = 50.0  # Base score
        explanation_parts = []
        
        # Check for numeric values
        if claim.get("numeric_value") is not None:
            score += 15
            explanation_parts.append("includes specific numeric target")
        
        # Check for baseline year
        if claim.get("baseline_year"):
            score += 15
            explanation_parts.append("specifies baseline year")
        
        # Check for target year
        if claim.get("target_year"):
            score += 10
            explanation_parts.append("has clear target year")
        
        # Check for scope coverage
        if claim.get("scope_covered"):
            score += 10
            explanation_parts.append("defines emission scopes")
        
        score = min(100.0, score)
        
        explanation = f"Claim {', '.join(explanation_parts) if explanation_parts else 'lacks specific details'}."
        
        return {
            "dimension": "verifiability",
            "value": score,
            "explanation": explanation
        }
    
    def _score_scope_coverage(self, claim: Dict) -> Dict:
        """
        Score based on emission scope coverage (Scope 1, 2, 3)
        """
        scopes = claim.get("scope_covered", [])
        
        if not scopes:
            return {
                "dimension": "scope_coverage",
                "value": 30.0,
                "explanation": "No emission scope specified. Coverage unclear."
            }
        
        # Check if Scope 3 is included (most comprehensive)
        has_scope3 = "S3" in scopes or "Scope 3" in scopes
        
        if has_scope3:
            value = 90.0
            explanation = f"Covers {len(scopes)} scope(s) including Scope 3 (most comprehensive)."
        elif len(scopes) >= 2:
            value = 70.0
            explanation = f"Covers {len(scopes)} scope(s) but excludes Scope 3."
        else:
            value = 50.0
            explanation = f"Limited to {len(scopes)} scope(s). May not reflect full emissions."
        
        return {
            "dimension": "scope_coverage",
            "value": value,
            "explanation": explanation
        }
    
    def _score_offset_dependency(self, claim: Dict, evidence_list: List[Dict]) -> Dict:
        """
        Score based on reliance on carbon offsets vs direct reductions
        """
        claim_text = claim.get("claim_text", "").lower()
        claim_type = claim.get("claim_type", "").lower()
        
        # Check for offset-related keywords
        offset_keywords = ["offset", "carbon credit", "compensation", "neutralization"]
        has_offset = any(keyword in claim_text for keyword in offset_keywords)
        
        if has_offset or claim_type == "offset":
            value = 40.0
            explanation = "Claim appears to rely on carbon offsets rather than direct emissions reductions."
        else:
            # Check evidence for offset mentions
            evidence_texts = " ".join([e.get("rationale", "") for e in evidence_list]).lower()
            if any(keyword in evidence_texts for keyword in offset_keywords):
                value = 60.0
                explanation = "Evidence suggests some reliance on offsets."
            else:
                value = 85.0
                explanation = "Appears to focus on direct emissions reductions."
        
        return {
            "dimension": "offset_dependency",
            "value": value,
            "explanation": explanation
        }
    
    def _calculate_overall_rating(self, scores: List[Dict]) -> str:
        """
        Calculate traffic-light rating from dimension scores
        Returns: "red" | "amber" | "green"
        """
        if not scores:
            return "red"
        
        # Calculate weighted average
        weights = {
            "integrity": 0.4,
            "verifiability": 0.3,
            "scope_coverage": 0.2,
            "offset_dependency": 0.1
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for score in scores:
            dimension = score["dimension"]
            value = score["value"]
            weight = weights.get(dimension, 0.25)
            
            weighted_sum += value * weight
            total_weight += weight
        
        average = weighted_sum / total_weight if total_weight > 0 else 0
        
        # Traffic light thresholds
        if average >= 70:
            return "green"
        elif average >= 40:
            return "amber"
        else:
            return "red"

