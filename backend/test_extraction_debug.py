#!/usr/bin/env python3
"""
Diagnostic script to test claim extraction on the Amazon report
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from services.pdf_processor import PDFProcessor
from services.claim_extractor import ClaimExtractor
import structlog
import json

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
    ]
)

logger = structlog.get_logger()


def main():
    print("="*80)
    print("DIAGNOSTIC TEST: Claim Extraction from Amazon Report")
    print("="*80 + "\n")
    
    pdf_path = "./uploads/2024-amazon-sustainability-report.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ ERROR: PDF not found at {pdf_path}")
        return
    
    print(f"✓ Found PDF: {pdf_path}")
    print(f"  Size: {os.path.getsize(pdf_path) / 1024 / 1024:.2f} MB\n")
    
    # Step 1: Extract PDF text
    print("Step 1: Extracting PDF text...")
    pdf_processor = PDFProcessor()
    pdf_data = pdf_processor.process_pdf(pdf_path)
    
    full_text = pdf_data["full_text"]
    page_dict = pdf_data["page_dict"]
    
    print(f"✓ Extracted {len(full_text):,} characters")
    print(f"✓ Number of pages: {len(page_dict)}")
    print(f"\nFirst 500 chars of document:")
    print("-" * 80)
    print(full_text[:500])
    print("-" * 80 + "\n")
    
    # Step 2: Extract claims
    print("Step 2: Extracting claims with improved algorithm...")
    print("(This may take 30-60 seconds...)\n")
    
    extractor = ClaimExtractor()
    claims = extractor.extract_claims(full_text, page_dict)
    
    print("\n" + "="*80)
    print(f"RESULTS: Found {len(claims)} claims")
    print("="*80 + "\n")
    
    if len(claims) == 0:
        print("❌ NO CLAIMS FOUND")
        print("\nPossible reasons:")
        print("  1. API key issue")
        print("  2. Gemini API returned empty response")
        print("  3. Document sampling missed key sections")
        print("  4. JSON parsing failed")
        print("\nCheck the logs above for error messages.")
        return
    
    # Display claims
    for i, claim in enumerate(claims, 1):
        print(f"\nClaim {i}:")
        print(f"  Text: {claim.get('claim_text', 'N/A')[:100]}...")
        print(f"  Type: {claim.get('claim_type', 'N/A')}")
        print(f"  Topic: {claim.get('topic', 'N/A')}")
        print(f"  Target Year: {claim.get('target_year', 'N/A')}")
        print(f"  Numeric Value: {claim.get('numeric_value', 'N/A')} {claim.get('units', '')}")
        print(f"  Confidence: {claim.get('confidence', 'N/A')}/3")
        print(f"  Scope: {claim.get('scope_covered', [])}")
        
        if i >= 5:  # Show first 5 claims
            print(f"\n... and {len(claims) - 5} more claims")
            break
    
    # Save to file
    output_file = "test_extraction_results.json"
    with open(output_file, 'w') as f:
        json.dump(claims, f, indent=2)
    
    print(f"\n✓ Full results saved to: {output_file}")
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()

