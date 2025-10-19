#!/usr/bin/env python3
"""
Test claim extraction via the API
"""
import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_extraction():
    print("="*80)
    print("Testing Claim Extraction via API")
    print("="*80 + "\n")
    
    # Step 1: Check if API is healthy
    print("Step 1: Checking API health...")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✓ API is healthy\n")
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("Make sure Docker containers are running: docker-compose ps")
        return
    
    # Step 2: Get list of documents
    print("Step 2: Fetching documents...")
    response = requests.get(f"{API_BASE}/api/documents")
    documents = response.json()
    
    if not documents:
        print("❌ No documents found. Please upload a document first.")
        return
    
    print(f"✓ Found {len(documents)} document(s)\n")
    
    # Use the first document
    document = documents[0]
    doc_id = document['id']
    doc_title = document['title']
    
    print(f"Testing with document:")
    print(f"  ID: {doc_id}")
    print(f"  Title: {doc_title}\n")
    
    # Step 3: Check for existing claims
    print("Step 3: Checking for existing claims...")
    response = requests.get(f"{API_BASE}/api/documents/{doc_id}/claims")
    existing_claims = response.json() if response.status_code == 200 else []
    
    if existing_claims:
        print(f"✓ Found {len(existing_claims)} existing claims")
        print("\nFirst few claims:")
        for i, claim in enumerate(existing_claims[:3], 1):
            print(f"\n  Claim {i}:")
            print(f"    {claim.get('claim_text', 'N/A')[:80]}...")
            print(f"    Type: {claim.get('claim_type', 'N/A')}")
            print(f"    Rating: {claim.get('overall_rating', 'N/A')}")
        
        if len(existing_claims) > 3:
            print(f"\n  ... and {len(existing_claims) - 3} more claims")
        
        print("\n✅ SUCCESS: Claims are being extracted!")
        return
    else:
        print("⚠️  No existing claims found")
    
    # Step 4: Trigger new analysis
    print("\nStep 4: Triggering analysis (this may take 1-2 minutes)...")
    print("Please wait...\n")
    
    try:
        response = requests.post(
            f"{API_BASE}/api/documents/{doc_id}/analyze",
            timeout=180  # 3 minute timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            claims = result.get('claims', [])
            
            print("\n" + "="*80)
            print(f"RESULTS: Found {len(claims)} claims")
            print("="*80 + "\n")
            
            if len(claims) == 0:
                print("❌ NO CLAIMS FOUND")
                print("\nThis indicates the issue is still present.")
                print("Check backend logs: docker-compose logs python-api")
                return
            
            print("✅ SUCCESS: Claims extracted!")
            print("\nFirst few claims:")
            for i, claim in enumerate(claims[:5], 1):
                print(f"\n  Claim {i}:")
                print(f"    {claim.get('claim_text', 'N/A')[:80]}...")
                print(f"    Type: {claim.get('claim_type', 'N/A')}")
                print(f"    Topic: {claim.get('topic', 'N/A')}")
                print(f"    Rating: {claim.get('overall_rating', 'N/A')}")
            
            if len(claims) > 5:
                print(f"\n  ... and {len(claims) - 5} more claims")
            
            # Save results
            with open('api_test_results.json', 'w') as f:
                json.dump(result, f, indent=2)
            print("\n✓ Full results saved to: api_test_results.json")
            
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 3 minutes")
        print("The analysis may still be running. Check logs: docker-compose logs python-api")
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
    
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    # Wait a moment for container to fully restart
    print("Waiting for container to fully start...")
    time.sleep(3)
    test_extraction()

