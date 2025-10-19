"""
Test suite for prompt optimization validation
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from test_cases import ALL_TEST_CASES, EXPECTED_OUTCOMES
from services.claim_extractor import ClaimExtractor
from services.evidence_analyzer import EvidenceAnalyzer
from services.scorer import ClaimScorer
import structlog

logger = structlog.get_logger()


class PromptTester:
    """Test prompt effectiveness with synthetic examples"""
    
    def __init__(self):
        self.claim_extractor = ClaimExtractor()
        self.evidence_analyzer = EvidenceAnalyzer()
        self.scorer = ClaimScorer()
        self.results = []
    
    def run_all_tests(self):
        """Run all test cases and collect results"""
        print("\n" + "="*80)
        print("RUNNING PROMPT OPTIMIZATION TESTS")
        print("="*80 + "\n")
        
        for i, test_case in enumerate(ALL_TEST_CASES, 1):
            print(f"\nTest {i}/{ len(ALL_TEST_CASES)}: {test_case['description']}")
            print("-" * 80)
            result = self.run_test_case(test_case)
            self.results.append(result)
            self.print_result(result)
        
        self.print_summary()
    
    def run_test_case(self, test_case):
        """Run a single test case"""
        try:
            # Extract claims
            claims = self.claim_extractor.extract_claims(
                test_case["document_text"]
            )
            
            result = {
                "description": test_case["description"],
                "extracted_claims": len(claims),
                "expected_claims": len(test_case.get("expected_claims", [])),
                "claims_data": claims,
                "success": True,
                "errors": []
            }
            
            # Validate extraction
            if len(claims) == 0:
                result["errors"].append("No claims extracted")
            
            # Check for confidence scores if present
            for claim in claims:
                if "confidence" in claim:
                    result["has_confidence_scores"] = True
                    break
            else:
                result["has_confidence_scores"] = False
            
            # Check claim structure
            for claim in claims:
                expected_fields = ["claim_text", "claim_type", "topic"]
                missing_fields = [f for f in expected_fields if f not in claim]
                if missing_fields:
                    result["errors"].append(f"Missing fields: {missing_fields}")
            
            return result
            
        except Exception as e:
            logger.error(f"Test failed: {str(e)}")
            return {
                "description": test_case["description"],
                "success": False,
                "error": str(e)
            }
    
    def print_result(self, result):
        """Print test result"""
        if result["success"]:
            print(f"  ✓ Extracted {result['extracted_claims']} claims")
            print(f"  ✓ Expected {result['expected_claims']} claims")
            print(f"  ✓ Has confidence scores: {result.get('has_confidence_scores', False)}")
            
            if result["errors"]:
                print(f"  ✗ Issues: {', '.join(result['errors'])}")
            
            # Show first claim as example
            if result["claims_data"]:
                claim = result["claims_data"][0]
                print(f"\n  Example claim:")
                print(f"    Text: {claim.get('claim_text', 'N/A')[:80]}...")
                print(f"    Type: {claim.get('claim_type', 'N/A')}")
                print(f"    Confidence: {claim.get('confidence', 'N/A')}")
        else:
            print(f"  ✗ FAILED: {result.get('error', 'Unknown error')}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total = len(self.results)
        successful = sum(1 for r in self.results if r["success"])
        
        print(f"\nTotal tests: {total}")
        print(f"Successful: {successful}")
        print(f"Failed: {total - successful}")
        
        # Calculate metrics
        total_extracted = sum(r.get("extracted_claims", 0) for r in self.results if r["success"])
        total_expected = sum(r.get("expected_claims", 0) for r in self.results if r["success"])
        
        print(f"\nTotal claims extracted: {total_extracted}")
        print(f"Total claims expected: {total_expected}")
        
        if total_expected > 0:
            recall = (total_extracted / total_expected) * 100
            print(f"Approximate recall: {recall:.1f}%")
        
        # Check confidence scores
        with_confidence = sum(1 for r in self.results if r.get("has_confidence_scores"))
        print(f"\nTests with confidence scores: {with_confidence}/{total}")
        
        print("\n" + "="*80 + "\n")


def main():
    """Run the test suite"""
    tester = PromptTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()

