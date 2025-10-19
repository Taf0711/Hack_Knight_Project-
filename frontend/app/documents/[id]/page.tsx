'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Box, Container, Button, Alert, CircularProgress, Fab, Zoom, 
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Typography 
} from '@mui/material'
import { 
  ArrowBack, KeyboardArrowDown, MoreVert, Refresh, 
  RestartAlt, Delete 
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { 
  getDocument, analyzeDocument, getDocumentClaims, 
  reanalyzeDocument, reprocessDocument 
} from '@/lib/api'
import { VerdictSummary } from '@/components/results/VerdictSummary'
import { ClaimsList } from '@/components/results/ClaimsList'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const documentId = params.id as string
  
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [autoAnalyzeTriggered, setAutoAnalyzeTriggered] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const claimsRef = useRef<HTMLDivElement>(null)
  
  const menuOpen = Boolean(anchorEl)

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

  const reanalyzeMutation = useMutation({
    mutationFn: () => reanalyzeDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', documentId] })
      setAnchorEl(null)
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: () => reprocessDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', documentId] })
      setAnchorEl(null)
    },
  })

  const handleAnalyze = () => {
    analyzeMutation.mutate()
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleReanalyze = () => {
    if (confirm('This will delete all existing claims and re-run the analysis. Continue?')) {
      reanalyzeMutation.mutate()
    }
  }

  const handleReprocess = () => {
    if (confirm('This will delete all passages and claims, then reprocess the PDF from scratch. This may take 2-3 minutes. Continue?')) {
      reprocessMutation.mutate()
    }
  }

  const scrollToClaims = () => {
    claimsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Define hasClaims before useEffect
  const hasClaims = claims && claims.length > 0

  // Auto-trigger analysis when document loads with no claims
  useEffect(() => {
    if (!claimsLoading && !hasClaims && !autoAnalyzeTriggered && !analyzeMutation.isPending && document) {
      setAutoAnalyzeTriggered(true)
      analyzeMutation.mutate()
    }
  }, [claimsLoading, hasClaims, autoAnalyzeTriggered, analyzeMutation, document])

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

  // hasClaims already defined above before useEffect

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#2d6a4f', borderBottom: 'none', py: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg" className="container-max">
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
              sx={{ 
                fontWeight: 600,
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Back to Documents
            </Button>
            
            <Box display="flex" gap={1}>
              {!claimsLoading && !hasClaims && !autoAnalyzeTriggered && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  sx={{
                    background: '#1b4332',
                    fontWeight: 600,
                    px: 4,
                    boxShadow: 'none',
                    '&:hover': {
                      background: '#081c15',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Document'}
                </Button>
              )}
              
              {hasClaims && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<MoreVert />}
                    onClick={handleMenuOpen}
                    disabled={reanalyzeMutation.isPending || reprocessMutation.isPending}
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Actions
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={handleReanalyze} disabled={reanalyzeMutation.isPending}>
                      <ListItemIcon>
                        <Refresh fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Reanalyze Claims" 
                        secondary="Delete claims and re-run analysis"
                      />
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleReprocess} disabled={reprocessMutation.isPending}>
                      <ListItemIcon>
                        <RestartAlt fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Reprocess Document" 
                        secondary="Reprocess PDF from scratch"
                      />
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Document Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Box sx={{ mb: 4, textAlign: 'center', px: { xs: 2, md: 0 } }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#1b4332' }}>
              {document.title}
            </h1>
            {document.year && (
              <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
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

        {/* Analysis/Reanalysis in Progress */}
        {(analyzeMutation.isPending || reanalyzeMutation.isPending) && (
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
              <strong>
                {reanalyzeMutation.isPending 
                  ? 'Reanalyzing Document...' 
                  : autoAnalyzeTriggered 
                    ? 'Analyzing Document...' 
                    : 'Analyzing Document...'}
              </strong>
              <br />
              This may take 1-2 minutes. We're extracting claims, gathering evidence, and calculating scores.
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={40} />
                <Typography variant="caption" color="text.secondary">
                  Processing PDF... Please wait
                </Typography>
              </Box>
            </Alert>
          </motion.div>
        )}

        {/* Reprocessing in Progress */}
        {reprocessMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert
              severity="warning"
              icon={<CircularProgress size={24} />}
              sx={{
                mb: 3,
                bgcolor: '#fff7ed',
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <strong>Reprocessing Document...</strong>
              <br />
              Extracting text, chunking, and generating embeddings. This may take 2-3 minutes.
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
                  borderColor: '#2d6a4f',
                  color: '#2d6a4f',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: '#1b4332',
                    bgcolor: 'rgba(45, 106, 79, 0.05)',
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
        {!claimsLoading && (hasAnalyzed || autoAnalyzeTriggered) && claims && claims.length === 0 && !analyzeMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
              <strong>No Environmental Claims Detected</strong>
              <br />
              The AI could not find any environmental or sustainability claims in this document. 
              This could mean the document doesn't contain climate commitments, or they may be in an unusual format.
            </Alert>
          </motion.div>
        )}
      </Container>

      {/* Scroll to Top FAB */}
      {hasClaims && (
        <Zoom in={true}>
            <Fab
              size="medium"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                bgcolor: '#2d6a4f',
                color: 'white',
                '&:hover': {
                  bgcolor: '#1b4332',
                }
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
