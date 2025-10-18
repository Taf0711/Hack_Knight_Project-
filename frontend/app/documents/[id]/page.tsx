'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Box, Container, Button, Alert, CircularProgress, Fab, Zoom } from '@mui/material'
import { ArrowBack, KeyboardArrowDown } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getDocument, analyzeDocument, getDocumentClaims } from '@/lib/api'
import { VerdictSummary } from '@/components/results/VerdictSummary'
import { ClaimsList } from '@/components/results/ClaimsList'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const claimsRef = useRef<HTMLDivElement>(null)

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId),
  })

  // Always try to fetch claims (they might already exist from a previous analysis)
  const { data: claims, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ['claims', documentId],
    queryFn: () => getDocumentClaims(documentId),
    enabled: true,
    retry: false,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeDocument(documentId),
    onSuccess: () => {
      setHasAnalyzed(true)
      refetchClaims()
    },
  })

  const handleAnalyze = () => {
    analyzeMutation.mutate()
  }

  const scrollToClaims = () => {
    claimsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (docLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    )
  }

  if (!document) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Document not found
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/')}
          variant="contained"
        >
          Return to Home
        </Button>
      </Container>
    )
  }

  const hasClaims = claims && claims.length > 0

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', py: 2 }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
              sx={{ fontWeight: 600 }}
            >
              Back to Documents
            </Button>
            
            {!claimsLoading && !hasClaims && (
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600,
                  px: 4,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8d 100%)',
                  }
                }}
              >
                {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Document'}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Document Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              {document.title}
            </h1>
            {document.year && (
              <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: 0 }}>
                Year: {document.year}
              </p>
            )}
          </Box>
        </motion.div>

        {/* Analysis Error */}
        {analyzeMutation.isError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert severity="error" sx={{ mb: 3 }}>
              <strong>Analysis Failed</strong>
              <br />
              {(analyzeMutation.error as any)?.response?.data?.detail || 
               'An error occurred during analysis. Please try again.'}
            </Alert>
          </motion.div>
        )}

        {/* Analysis in Progress */}
        {analyzeMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert
              severity="info"
              icon={<CircularProgress size={24} />}
              sx={{
                mb: 3,
                bgcolor: '#eff6ff',
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <strong>Analyzing Document...</strong>
              <br />
              This may take 1-2 minutes. We're extracting claims, gathering evidence, and calculating scores.
              <Box sx={{ mt: 2 }}>
                <CircularProgress size={40} />
              </Box>
            </Alert>
          </motion.div>
        )}

        {/* Claims Loading */}
        {claimsLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Box textAlign="center">
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <p style={{ color: '#6b7280' }}>Loading analysis results...</p>
            </Box>
          </Box>
        )}

        {/* Verdict Summary */}
        {!claimsLoading && hasClaims && (
          <>
            <VerdictSummary claims={claims} />
            
            {/* Scroll to Details Button */}
            <Box display="flex" justifyContent="center" mb={4}>
              <Button
                variant="outlined"
                size="large"
                onClick={scrollToClaims}
                endIcon={<KeyboardArrowDown />}
                sx={{
                  borderRadius: 50,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  }
                }}
              >
                View Detailed Analysis
              </Button>
            </Box>
          </>
        )}

        {/* Detailed Claims */}
        {!claimsLoading && hasClaims && (
          <div ref={claimsRef}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                  Detailed Claim Analysis
                </h2>
                <span style={{ fontSize: '1rem', color: '#6b7280' }}>
                  {claims.length} claim{claims.length !== 1 ? 's' : ''} found
                </span>
              </Box>
              <ClaimsList claims={claims} />
            </motion.div>
          </div>
        )}

        {/* No Claims Found After Analysis */}
        {!claimsLoading && hasAnalyzed && claims && claims.length === 0 && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            No environmental claims detected in this document.
          </Alert>
        )}

        {/* Instructions */}
        {!claimsLoading && !hasAnalyzed && !hasClaims && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 4, boxShadow: 2 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: 0 }}>
                Ready to Analyze
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.05rem' }}>
                Click the "Analyze Document" button to start the greenwashing detection process. 
                The AI will:
              </p>
              <ul style={{ color: '#6b7280', fontSize: '1.05rem', lineHeight: 1.8 }}>
                <li>Extract all environmental and sustainability claims</li>
                <li>Gather supporting or contradicting evidence from the document</li>
                <li>Score each claim across multiple dimensions</li>
                <li>Provide traffic-light ratings (Red/Amber/Green)</li>
                <li>Generate citation-backed explanations</li>
              </ul>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                Analysis typically takes 1-2 minutes depending on document length.
              </p>
            </Box>
          </motion.div>
        )}
      </Container>

      {/* Scroll to Top FAB */}
      {hasClaims && (
        <Zoom in={true}>
          <Fab
            color="primary"
            size="medium"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <KeyboardArrowDown sx={{ transform: 'rotate(180deg)' }} />
          </Fab>
        </Zoom>
      )}
    </Box>
  )
}
