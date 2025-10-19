"""
Test cases with synthetic sustainability claims for validation
"""

# Test Case 1: Clear, verifiable claim (should be GREEN)
TEST_CASE_GREEN = {
    "document_text": """
    Our 2023 Sustainability Report
    
    Emissions Reduction Achievement:
    We have successfully reduced our Scope 1 and Scope 2 greenhouse gas emissions by 30% 
    compared to our 2019 baseline of 10,000 tCO2e. Our 2023 emissions total 7,000 tCO2e.
    This reduction was achieved through:
    - Installation of solar panels (2,500 tCO2e reduction)
    - Energy efficiency upgrades (1,500 tCO2e reduction)
    - Fleet electrification (1,000 tCO2e reduction)
    
    Methodology: Calculated using the GHG Protocol Corporate Standard. 
    Third-party verified by Bureau Veritas.
    """,
    "expected_claims": [
        {
            "claim_text": "reduced Scope 1 and Scope 2 emissions by 30% from 2019 baseline by 2023",
            "claim_type": "achievement",
            "numeric_value": 30.0,
            "units": "%",
            "baseline_year": 2019,
            "target_year": 2023,
            "scope_covered": ["S1", "S2"],
            "expected_rating": "green"
        }
    ],
    "description": "Specific, verifiable claim with clear methodology and third-party verification"
}

# Test Case 2: Vague, unverifiable claim (should be RED)
TEST_CASE_RED = {
    "document_text": """
    Sustainability Commitment
    
    We are committed to being a leader in environmental sustainability. 
    Our products are eco-friendly and we use green energy wherever possible.
    We aim to reduce our carbon footprint significantly in the coming years.
    Our company culture embraces sustainability at every level.
    """,
    "expected_claims": [
        {
            "claim_text": "committed to being a leader in environmental sustainability",
            "claim_type": "commitment",
            "expected_rating": "red",
            "issues": ["vague", "no_metrics", "no_baseline", "no_target"]
        },
        {
            "claim_text": "aim to reduce carbon footprint significantly",
            "claim_type": "plan",
            "expected_rating": "red",
            "issues": ["vague", "no_metrics", "no_timeline"]
        }
    ],
    "description": "Vague claims with no specific targets, baselines, or methodologies"
}

# Test Case 3: Partially supported claim (should be AMBER)
TEST_CASE_AMBER = {
    "document_text": """
    Net Zero Target
    
    We have set an ambitious target to achieve net zero emissions by 2050.
    This includes Scope 1 and Scope 2 emissions only.
    
    Our plan includes transitioning to renewable energy and improving efficiency.
    However, specific reduction pathways and interim targets are still being developed.
    """,
    "expected_claims": [
        {
            "claim_text": "achieve net zero emissions by 2050 for Scope 1 and 2",
            "claim_type": "target",
            "target_year": 2050,
            "scope_covered": ["S1", "S2"],
            "expected_rating": "amber",
            "issues": ["no_baseline", "no_interim_targets", "excludes_scope3", "lacks_detail"]
        }
    ],
    "description": "Long-term target with some specificity but missing critical details and excludes Scope 3"
}

# Test Case 4: Offset-dependent claim (should be AMBER/RED)
TEST_CASE_OFFSETS = {
    "document_text": """
    Carbon Neutrality Achievement
    
    We achieved carbon neutrality in 2023 through a combination of:
    - 10% emissions reduction from energy efficiency
    - 90% carbon offset purchases from forestry projects
    
    Total emissions: 50,000 tCO2e
    Offsets purchased: 45,000 tCO2e
    """,
    "expected_claims": [
        {
            "claim_text": "achieved carbon neutrality in 2023",
            "claim_type": "achievement",
            "target_year": 2023,
            "expected_rating": "amber",
            "issues": ["high_offset_dependency", "minimal_direct_reduction"]
        }
    ],
    "description": "Heavy reliance on offsets rather than direct emissions reductions"
}

# Test Case 5: Missing baseline/scope claim (should be AMBER/RED)
TEST_CASE_INCOMPLETE = {
    "document_text": """
    Emissions Reduction Progress
    
    We have reduced our emissions by 25% over the past five years.
    This represents significant progress in our sustainability journey.
    We continue to invest in clean technology and sustainable operations.
    """,
    "expected_claims": [
        {
            "claim_text": "reduced emissions by 25% over the past five years",
            "claim_type": "achievement",
            "numeric_value": 25.0,
            "units": "%",
            "expected_rating": "amber",
            "issues": ["no_specific_baseline", "no_scope_definition", "no_absolute_numbers"]
        }
    ],
    "description": "Claim with percentage but missing baseline year, scope definition, and absolute values"
}

# All test cases
ALL_TEST_CASES = [
    TEST_CASE_GREEN,
    TEST_CASE_RED,
    TEST_CASE_AMBER,
    TEST_CASE_OFFSETS,
    TEST_CASE_INCOMPLETE
]

# Expected outcomes for validation
EXPECTED_OUTCOMES = {
    "green_case": {
        "min_claims": 1,
        "expected_rating": "green",
        "should_have_baseline": True,
        "should_have_scope": True,
        "should_have_methodology": True
    },
    "red_case": {
        "min_claims": 1,
        "expected_rating": "red",
        "should_flag_vagueness": True
    },
    "amber_case": {
        "min_claims": 1,
        "expected_rating": "amber",
        "should_flag_missing_details": True
    },
    "offset_case": {
        "min_claims": 1,
        "should_flag_offset_dependency": True
    },
    "incomplete_case": {
        "min_claims": 1,
        "should_flag_missing_baseline": True
    }
}

