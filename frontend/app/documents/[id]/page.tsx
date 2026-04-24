'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Container, Button, Alert, CircularProgress, Fab, Zoom,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Typography,
  Tabs, Tab, LinearProgress, Chip, Stack
} from '@mui/material'
import {
  ArrowBack, KeyboardArrowDown, MoreVert, Refresh,
  RestartAlt, FactCheck, AccountTree, AutoAwesome,
  DocumentScanner, FindInPage, Biotech, TaskAlt
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getDocument, getDocumentClaims,
  reanalyzeDocument, reprocessDocument,
  startAnalysis, getAnalysisStatus,
  AnalysisJobPhase, AnalysisStatus
} from '@/lib/api'
import { VerdictSummary } from '@/components/results/VerdictSummary'
import { ClaimsList } from '@/components/results/ClaimsList'
import { PdfViewerProvider } from '@/components/documents/PdfViewer'
import { SegmentInspector } from '@/components/documents/SegmentInspector'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const documentId = params.id as string
  
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [autoAnalyzeTriggered, setAutoAnalyzeTriggered] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeTab, setActiveTab] = useState<'claims' | 'structure'>('claims')
  const claimsRef = useRef<HTMLDivElement>(null)
  
  const menuOpen = Boolean(anchorEl)

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId),
  })

  // Poll the analysis-status endpoint while a run is in flight so progress
  // (phase, current claim, count) stays live in the UI.
  const { data: status } = useQuery<AnalysisStatus>({
    queryKey: ['analysis-status', documentId],
    queryFn: () => getAnalysisStatus(documentId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'running' || s === 'queued' ? 2000 : false
    },
    refetchIntervalInBackground: true,
  })

  const isAnalyzing =
    status?.status === 'running' || status?.status === 'queued'

  // Fetch claims; while an analysis is running, refetch every 2s so the list
  // ticks up as per-claim commits land.
  const { data: claims, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ['claims', documentId],
    queryFn: () => getDocumentClaims(documentId),
    enabled: true,
    retry: false,
    refetchInterval: isAnalyzing ? 2000 : false,
  })

  const startAnalysisMutation = useMutation({
    mutationFn: () => startAnalysis(documentId),
    onSuccess: () => {
      setHasAnalyzed(true)
      queryClient.invalidateQueries({ queryKey: ['analysis-status', documentId] })
    },
  })

  // When a run finishes, refresh the claims list one last time to pick up
  // anything committed between the last poll tick and the completion event.
  useEffect(() => {
    if (status?.status === 'completed' || status?.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['claims', documentId] })
    }
  }, [status?.status, documentId, queryClient])

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
    startAnalysisMutation.mutate()
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

  // Auto-trigger analysis when the document loads and no claims exist yet and
  // no job is already running. We check `status` so we don't double-fire if the
  // user reloads mid-run.
  useEffect(() => {
    if (
      !claimsLoading &&
      !hasClaims &&
      !autoAnalyzeTriggered &&
      !startAnalysisMutation.isPending &&
      !isAnalyzing &&
      status?.status !== 'completed' &&
      document
    ) {
      setAutoAnalyzeTriggered(true)
      startAnalysisMutation.mutate()
    }
  }, [
    claimsLoading,
    hasClaims,
    autoAnalyzeTriggered,
    startAnalysisMutation,
    isAnalyzing,
    status?.status,
    document,
  ])

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
    <PdfViewerProvider>
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
              {!claimsLoading && !hasClaims && !autoAnalyzeTriggered && !isAnalyzing && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleAnalyze}
                  disabled={startAnalysisMutation.isPending || isAnalyzing}
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
                  {startAnalysisMutation.isPending ? 'Starting…' : 'Analyze Document'}
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

        {/* Analysis Error: either the start-mutation errored or the server reported a failed job */}
        {(startAnalysisMutation.isError || status?.status === 'failed') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <strong>Analysis Failed</strong>
              <br />
              {status?.error ||
                (startAnalysisMutation.error as any)?.response?.data?.detail ||
                'An error occurred during analysis. Please try again.'}
            </Alert>
          </motion.div>
        )}

        {/* Live progress banner — replaces the old spinner-only card */}
        {(isAnalyzing || reanalyzeMutation.isPending) && (
          <AnalysisProgressBanner
            status={status}
            reanalyzing={reanalyzeMutation.isPending}
          />
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

        {/* Detailed Claims + Structure Tabs */}
        {!claimsLoading && hasClaims && (
          <div ref={claimsRef}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Box
                sx={{
                  mb: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(_, next) => setActiveTab(next as 'claims' | 'structure')}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                    },
                    '& .Mui-selected': { color: '#1b4332 !important' },
                    '& .MuiTabs-indicator': { bgcolor: '#1b4332', height: 3 },
                  }}
                >
                  <Tab
                    value="claims"
                    label={`Claims (${claims.length})`}
                    icon={<FactCheck fontSize="small" />}
                    iconPosition="start"
                  />
                  <Tab
                    value="structure"
                    label="Document Structure"
                    icon={<AccountTree fontSize="small" />}
                    iconPosition="start"
                  />
                </Tabs>
                {activeTab === 'claims' && (
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    Click any citation to jump into the source PDF
                  </span>
                )}
              </Box>

              {activeTab === 'claims' ? (
                <ClaimsList
                  claims={claims}
                  documentId={documentId}
                  documentTitle={document.title}
                />
              ) : (
                <SegmentInspector
                  documentId={documentId}
                  documentTitle={document.title}
                />
              )}
            </motion.div>
          </div>
        )}

        {/* No Claims Found After Analysis — only show once the job has actually finished */}
        {!claimsLoading &&
          (hasAnalyzed || autoAnalyzeTriggered) &&
          claims &&
          claims.length === 0 &&
          !isAnalyzing &&
          status?.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
              <strong>No Environmental Claims Detected</strong>
              <br />
              The AI could not find any environmental or sustainability claims in this document.
              This could mean the document doesn&apos;t contain climate commitments, or they may be in an unusual format.
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
    </PdfViewerProvider>
  )
}

const PHASE_META: Record<
  AnalysisJobPhase,
  { label: string; icon: JSX.Element; detail: string }
> = {
  idle: {
    label: 'Idle',
    icon: <AutoAwesome fontSize="small" />,
    detail: 'No analysis running.',
  },
  queued: {
    label: 'Queued',
    icon: <AutoAwesome fontSize="small" />,
    detail: 'Analysis job accepted — spinning up workers…',
  },
  starting: {
    label: 'Starting',
    icon: <AutoAwesome fontSize="small" />,
    detail: 'Warming up the pipeline.',
  },
  loading_document: {
    label: 'Loading document',
    icon: <DocumentScanner fontSize="small" />,
    detail: 'Extracting PDF text and reconstructing page layout.',
  },
  extracting_claims: {
    label: 'Extracting claims',
    icon: <FindInPage fontSize="small" />,
    detail: 'Gemini is reading the report and pulling every environmental claim.',
  },
  analyzing_evidence: {
    label: 'Analyzing evidence',
    icon: <Biotech fontSize="small" />,
    detail: 'Retrieving supporting passages and scoring each claim.',
  },
  finalizing: {
    label: 'Finalizing',
    icon: <TaskAlt fontSize="small" />,
    detail: 'Persisting the last scores and wrapping up.',
  },
  completed: {
    label: 'Completed',
    icon: <TaskAlt fontSize="small" />,
    detail: 'Analysis complete.',
  },
  failed: {
    label: 'Failed',
    icon: <TaskAlt fontSize="small" />,
    detail: 'Something went wrong during analysis.',
  },
}

function AnalysisProgressBanner({
  status,
  reanalyzing,
}: {
  status?: AnalysisStatus
  reanalyzing: boolean
}) {
  const phase = (status?.phase ?? 'queued') as AnalysisJobPhase
  const meta = PHASE_META[phase] ?? PHASE_META.queued

  const total = status?.total_claims_estimate ?? null
  const done = status?.claims_so_far ?? 0
  const determinate = typeof total === 'number' && total > 0
  const pct = determinate ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Box
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: '#b7e4c7',
          background:
            'linear-gradient(135deg, rgba(210,241,221,0.55) 0%, rgba(255,255,255,1) 70%)',
          boxShadow: '0 1px 2px rgba(27,67,50,0.06)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          mb={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: '#1b4332',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {meta.icon}
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: '#1b4332', lineHeight: 1.2 }}
              >
                {reanalyzing ? 'Reanalyzing document' : 'Analyzing document'} · {meta.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {meta.detail}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {determinate ? (
              <Chip
                size="small"
                label={`Claim ${done} / ${total}`}
                sx={{
                  bgcolor: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 700,
                }}
              />
            ) : (
              <Chip
                size="small"
                label={done > 0 ? `${done} claims so far` : 'Working…'}
                sx={{
                  bgcolor: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 700,
                }}
              />
            )}
            {typeof status?.claims_in_db === 'number' && (
              <Chip
                size="small"
                variant="outlined"
                label={`${status.claims_in_db} saved`}
                sx={{ borderColor: '#2d6a4f', color: '#1b4332', fontWeight: 600 }}
              />
            )}
          </Stack>
        </Stack>

        <LinearProgress
          variant={determinate ? 'determinate' : 'indeterminate'}
          value={pct}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: '#e7f4ec',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#1b4332',
              borderRadius: 999,
            },
          }}
        />

        {status?.current_claim_preview && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 1.5,
              display: 'block',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {status.current_claim_index ? `#${status.current_claim_index} · ` : ''}
            &ldquo;{status.current_claim_preview}&rdquo;
          </Typography>
        )}

        {status?.last_claim_error && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ mt: 1, display: 'block' }}
          >
            Last claim skipped: {status.last_claim_error}
          </Typography>
        )}
      </Box>
    </motion.div>
  )
}
