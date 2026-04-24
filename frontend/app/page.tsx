'use client'

import { useState, useCallback } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDown,
  faArrowRight,
  faBookOpen,
  faCircleCheck,
  faCircleExclamation,
  faCircleNodes,
  faFileLines,
  faFingerprint,
  faLeaf,
  faMagnifyingGlassChart,
  faQuoteLeft,
  faScaleBalanced,
  faSeedling,
  faShieldHalved,
  faTrashCan,
  faTrafficLight,
  faTriangleExclamation,
  faUpload,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { DocumentUpload } from '@/components/upload/DocumentUpload'
import { DocumentList } from '@/components/documents/DocumentList'
import { resetDatabase } from '@/lib/api'

const FOREST_900 = '#081c15'
const FOREST_800 = '#1b4332'
const FOREST_700 = '#2d6a4f'
const FOREST_500 = '#52b788'
const FOREST_300 = '#74c69d'
const FOREST_100 = '#d8f3dc'
const CREAM_50 = '#f8f5ef'
const CREAM_100 = '#f1ece0'
const AMBER = '#d4a24a'
const RED_ACC = '#c14b3f'

export default function HomePage() {
  const queryClient = useQueryClient()
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const resetMutation = useMutation({
    mutationFn: resetDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setRefreshKey((prev) => prev + 1)
      setResetDialogOpen(false)
    },
  })

  const scrollToUpload = useCallback(() => {
    const el = document.getElementById('upload-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const scrollToHow = useCallback(() => {
    const el = document.getElementById('how-it-works')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const steps = [
    {
      icon: faUpload,
      n: '01',
      title: 'Upload',
      description:
        'Drop a PDF sustainability or ESG report. We extract, chunk, and embed the entire document.',
    },
    {
      icon: faMagnifyingGlassChart,
      n: '02',
      title: 'Extract claims',
      description:
        'Gemini identifies every environmental claim — targets, baselines, scope, offsets, and tone.',
    },
    {
      icon: faBookOpen,
      n: '03',
      title: 'Verify with RAG',
      description:
        'Hybrid semantic + keyword search retrieves the strongest supporting or contradicting evidence.',
    },
    {
      icon: faTrafficLight,
      n: '04',
      title: 'Rate',
      description:
        'Each claim gets a traffic-light rating with citations and a multi-dimensional score.',
    },
  ]

  const dimensions = [
    { icon: faShieldHalved, label: 'Integrity', weight: '35%', desc: 'Specificity, baselines, and lack of vague language.' },
    { icon: faFingerprint, label: 'Verifiability', weight: '25%', desc: 'Whether the claim is grounded in the report.' },
    { icon: faCircleNodes, label: 'Scope coverage', weight: '15%', desc: 'Includes Scope 1, 2, and 3 where relevant.' },
    { icon: faScaleBalanced, label: 'Offset dependency', weight: '10%', desc: 'Real reductions vs. reliance on offsets.' },
    { icon: faWandMagicSparkles, label: 'Confidence', weight: '15%', desc: 'How certain the evidence analysis is.' },
  ]

  const features = [
    {
      icon: faQuoteLeft,
      title: 'Citation-backed',
      desc: 'Every verdict quotes the source page — no black-box output. Click through to the exact line.',
    },
    {
      icon: faTrafficLight,
      title: 'Traffic-light verdicts',
      desc: 'Red · Amber · Green ratings let you skim risk at a glance and dive into the details on demand.',
    },
    {
      icon: faScaleBalanced,
      title: 'Five-dimensional score',
      desc: 'We grade claims on integrity, verifiability, scope, offsets, and confidence — then weight and combine.',
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: CREAM_50, color: FOREST_900 }}>
      {/* ===== NAV ===== */}
      <Box
        component="nav"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'saturate(140%) blur(10px)',
          bgcolor: 'rgba(248,245,239,0.82)',
          borderBottom: '1px solid rgba(27,67,50,0.08)',
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: FOREST_800,
                color: CREAM_50,
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 6px 16px rgba(27,67,50,0.25)',
              }}
            >
              <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 16 }} />
            </Box>
            <Box>
              <Typography className="font-serif-display" sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1, color: FOREST_900 }}>
                Greenwash<span style={{ color: FOREST_700 }}>/</span>Detector
              </Typography>
              <Typography variant="caption" sx={{ color: FOREST_700, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Evidence-first sustainability audits
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button onClick={scrollToHow} sx={navLinkSx}>How it works</Button>
            <Button onClick={() => document.getElementById('scoring')?.scrollIntoView({ behavior: 'smooth' })} sx={navLinkSx}>
              Scoring
            </Button>
            <Button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} sx={navLinkSx}>
              Features
            </Button>
            <Button
              variant="contained"
              onClick={scrollToUpload}
              disableElevation
              sx={{
                bgcolor: FOREST_800,
                px: 2.5,
                py: 1,
                borderRadius: 999,
                fontWeight: 600,
                '&:hover': { bgcolor: FOREST_900 },
              }}
              endIcon={<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 12 }} />}
            >
              Analyze a report
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ===== HERO ===== */}
      <Box
        className="gradient-hero grain-overlay"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <Chip
                  icon={<FontAwesomeIcon icon={faSeedling} style={{ fontSize: 12, color: FOREST_700, marginLeft: 10 }} />}
                  label="Built for environmental accountability"
                  sx={{
                    bgcolor: 'rgba(45,106,79,0.08)',
                    color: FOREST_800,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    borderRadius: 999,
                    px: 1,
                    mb: 3,
                    border: '1px solid rgba(45,106,79,0.18)',
                  }}
                />

                <Typography
                  component="h1"
                  className="font-serif-display"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4.25rem' },
                    lineHeight: 1.02,
                    color: FOREST_900,
                    fontWeight: 800,
                    mb: 2.5,
                  }}
                >
                  Spot the{' '}
                  <Box component="span" sx={{ position: 'relative', whiteSpace: 'nowrap', color: FOREST_700 }}>
                    greenwash
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: -6,
                        height: 10,
                        borderRadius: 2,
                        bgcolor: AMBER,
                        opacity: 0.35,
                        zIndex: -1,
                      }}
                    />
                  </Box>
                  ,{' '}
                  <Box component="span" sx={{ fontStyle: 'italic', color: FOREST_800 }}>
                    prove
                  </Box>{' '}
                  the progress.
                </Typography>

                <Typography
                  sx={{
                    color: 'rgba(8,28,21,0.75)',
                    fontSize: { xs: '1.05rem', md: '1.2rem' },
                    maxWidth: 560,
                    mb: 4,
                    lineHeight: 1.55,
                  }}
                >
                  Upload a corporate sustainability report and our AI extracts every environmental claim,
                  cross-checks it against the document, and returns traffic-light verdicts with the exact
                  quotes that support — or contradict — each one.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={scrollToUpload}
                    startIcon={<FontAwesomeIcon icon={faUpload} style={{ fontSize: 14 }} />}
                    sx={{
                      bgcolor: FOREST_800,
                      color: CREAM_50,
                      px: 3.5,
                      py: 1.5,
                      borderRadius: 999,
                      fontSize: '1rem',
                      fontWeight: 700,
                      '&:hover': { bgcolor: FOREST_900, transform: 'translateY(-1px)' },
                    }}
                  >
                    Analyze a report
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={scrollToHow}
                    startIcon={<FontAwesomeIcon icon={faArrowDown} style={{ fontSize: 12 }} />}
                    sx={{
                      color: FOREST_800,
                      borderColor: 'rgba(27,67,50,0.35)',
                      px: 3,
                      py: 1.5,
                      borderRadius: 999,
                      fontSize: '1rem',
                      fontWeight: 600,
                      '&:hover': { borderColor: FOREST_800, bgcolor: 'rgba(27,67,50,0.04)' },
                    }}
                  >
                    See how it works
                  </Button>
                </Stack>

                <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ rowGap: 1.5, color: 'rgba(8,28,21,0.7)' }}>
                  <TrustItem icon={faCircleCheck} label="Citation-backed" />
                  <TrustItem icon={faShieldHalved} label="5-dimensional scoring" />
                  <TrustItem icon={faFileLines} label="Works with any PDF" />
                </Stack>
              </motion.div>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.1 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 5,
                    overflow: 'hidden',
                    boxShadow: '0 30px 60px -20px rgba(27,67,50,0.35), 0 2px 0 rgba(255,255,255,0.5) inset',
                    border: '1px solid rgba(27,67,50,0.1)',
                    bgcolor: CREAM_100,
                  }}
                >
                  <Box
                    component="img"
                    src="/hero-greenwash.png"
                    alt="Magnifying glass inspecting a sustainability report with a single leaf resting on top"
                    sx={{ display: 'block', width: '100%', height: 'auto' }}
                  />

                  {/* Floating verdict badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    style={{ position: 'absolute', left: 20, bottom: 20 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1.25,
                        pr: 2,
                        borderRadius: 999,
                        bgcolor: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(27,67,50,0.12)',
                        boxShadow: '0 6px 20px rgba(27,67,50,0.08)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Dot color={FOREST_700} />
                        <Dot color={AMBER} />
                        <Dot color={RED_ACC} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: FOREST_800 }}>
                        Traffic-light verdicts
                      </Typography>
                    </Paper>
                  </motion.div>

                  {/* Floating citation card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    style={{ position: 'absolute', right: 20, top: 20 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        pr: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(27,67,50,0.1)',
                        boxShadow: '0 6px 20px rgba(27,67,50,0.08)',
                        maxWidth: 240,
                        display: 'flex',
                        gap: 1.25,
                        alignItems: 'flex-start',
                      }}
                    >
                      <FontAwesomeIcon icon={faTriangleExclamation} color={AMBER} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: FOREST_800, display: 'block', lineHeight: 1.2 }}>
                          Page 34 · Offset-heavy
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(8,28,21,0.7)', fontStyle: 'italic' }}>
                          “…net-zero by 2030, largely through verified carbon credits…”
                        </Typography>
                      </Box>
                    </Paper>
                  </motion.div>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>

        {/* decorative bottom wave */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -1,
            lineHeight: 0,
            pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
            <path d="M0,40 C240,90 480,0 720,20 C960,40 1200,80 1440,30 L1440,80 L0,80 Z" fill={CREAM_50} />
          </svg>
        </Box>
      </Box>

      {/* ===== STATS / TRUST STRIP ===== */}
      <Box sx={{ bgcolor: CREAM_50, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              bgcolor: FOREST_900,
              color: CREAM_50,
              p: { xs: 3, md: 5 },
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: `
                radial-gradient(600px 200px at 10% 20%, rgba(116,198,157,0.15), transparent 60%),
                radial-gradient(500px 220px at 90% 100%, rgba(212,162,74,0.15), transparent 60%)
              `,
            }}
          >
            <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="overline" sx={{ color: FOREST_300, letterSpacing: 2, fontWeight: 700 }}>
                  Why it matters
                </Typography>
                <Typography className="font-serif-display" sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' }, fontWeight: 700, mt: 1, lineHeight: 1.2 }}>
                  Claims without evidence are where greenwashing hides.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={3}>
                  {[
                    { k: '5', v: 'Scoring dimensions' },
                    { k: '100%', v: 'Citation-backed' },
                    { k: '3', v: 'Verdict tiers' },
                    { k: '1-2 min', v: 'Typical analysis' },
                  ].map((s) => (
                    <Grid size={{ xs: 6, md: 3 }} key={s.v}>
                      <Box>
                        <Typography className="font-serif-display" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: CREAM_50, lineHeight: 1 }}>
                          {s.k}
                        </Typography>
                        <Typography variant="caption" sx={{ color: FOREST_300, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                          {s.v}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ===== UPLOAD + DOCUMENTS (FUNCTIONAL) ===== */}
      <Container maxWidth="lg" sx={{ pb: 8 }} id="upload-section">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: FOREST_700, letterSpacing: 2, fontWeight: 700 }}>
              Start an analysis
            </Typography>
            <Typography className="font-serif-display" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, fontWeight: 700, color: FOREST_900, mt: 0.5 }}>
              Drop a report. Get the truth.
            </Typography>
            <Typography sx={{ color: 'rgba(8,28,21,0.68)', mt: 0.5, maxWidth: 620 }}>
              Any PDF sustainability, ESG, or climate report works. Processing usually takes 1–2 minutes.
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'rgba(27,67,50,0.12)',
                  bgcolor: 'white',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  '&:hover': { borderColor: FOREST_300, transform: 'translateY(-3px)' },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={iconBadgeSx}>
                      <FontAwesomeIcon icon={faUpload} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: FOREST_800 }}>
                      Upload document
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(8,28,21,0.68)', mb: 3 }}>
                    Drag and drop your sustainability report, or click to browse. PDF only, up to 50&nbsp;MB.
                  </Typography>
                  <DocumentUpload onSuccess={handleUploadSuccess} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'rgba(27,67,50,0.12)',
                  bgcolor: 'white',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  '&:hover': { borderColor: FOREST_300, transform: 'translateY(-3px)' },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={iconBadgeSx}>
                        <FontAwesomeIcon icon={faFileLines} />
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: FOREST_800 }}>
                        Previous reports
                      </Typography>
                    </Box>
                    <Tooltip title="Clear all reports and start fresh">
                      <IconButton
                        size="small"
                        onClick={() => setResetDialogOpen(true)}
                        sx={{
                          color: RED_ACC,
                          '&:hover': { bgcolor: 'rgba(193,75,63,0.08)', transform: 'scale(1.08)' },
                        }}
                      >
                        <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(8,28,21,0.68)', mb: 3 }}>
                    Your prior analyses are kept here so you can revisit the verdicts anytime.
                  </Typography>
                  <DocumentList key={refreshKey} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* ===== HOW IT WORKS ===== */}
      <Box id="how-it-works" sx={{ bgcolor: CREAM_100, py: { xs: 8, md: 12 }, borderTop: '1px solid rgba(27,67,50,0.08)', borderBottom: '1px solid rgba(27,67,50,0.08)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="overline" sx={{ color: FOREST_700, letterSpacing: 2, fontWeight: 700 }}>
                The workflow
              </Typography>
              <Typography
                className="font-serif-display"
                sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: FOREST_900, mt: 1, lineHeight: 1.1 }}
              >
                From claim to{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: FOREST_700 }}>
                  citation
                </Box>{' '}
                in four steps.
              </Typography>
              <Typography sx={{ mt: 2, color: 'rgba(8,28,21,0.7)', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Our pipeline combines Gemini 2.5 Flash for claim extraction, a 768-dim pgvector index for
                semantic recall, and a weighted rubric for the final verdict — so every rating is traceable
                back to the exact line in the report.
              </Typography>

              <Box
                component="img"
                src="/how-it-works-leaf.png"
                alt="Leaf split between healthy green and traffic-light warning segments"
                sx={{
                  mt: 4,
                  width: '100%',
                  maxWidth: 360,
                  display: { xs: 'none', md: 'block' },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={2.5}>
                {steps.map((step, idx) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.3 + idx * 0.08 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        alignItems: 'center',
                        gap: { xs: 2, md: 3 },
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 3,
                        bgcolor: 'white',
                        border: '1px solid rgba(27,67,50,0.08)',
                        transition: 'all 0.25s ease',
                        '&:hover': { transform: 'translateX(4px)', borderColor: FOREST_300, boxShadow: '0 12px 30px -15px rgba(27,67,50,0.25)' },
                      }}
                    >
                      <Typography
                        className="font-serif-display"
                        sx={{ fontSize: { xs: '1.9rem', md: '2.25rem' }, fontWeight: 800, color: FOREST_700, minWidth: { xs: 44, md: 58 } }}
                      >
                        {step.n}
                      </Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: FOREST_900, fontSize: '1.1rem' }}>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(8,28,21,0.68)', mt: 0.5 }}>
                          {step.description}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: { xs: 40, md: 48 },
                          height: { xs: 40, md: 48 },
                          borderRadius: '50%',
                          bgcolor: FOREST_100,
                          color: FOREST_800,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FontAwesomeIcon icon={step.icon} />
                      </Box>
                    </Paper>
                  </motion.div>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ===== SCORING DIMENSIONS ===== */}
      <Box id="scoring" sx={{ py: { xs: 8, md: 12 }, bgcolor: CREAM_50 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 }, maxWidth: 760, mx: 'auto' }}>
            <Typography variant="overline" sx={{ color: FOREST_700, letterSpacing: 2, fontWeight: 700 }}>
              The rubric
            </Typography>
            <Typography
              className="font-serif-display"
              sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: FOREST_900, mt: 1, lineHeight: 1.1 }}
            >
              Five dimensions, one honest score.
            </Typography>
            <Typography sx={{ color: 'rgba(8,28,21,0.68)', mt: 2, fontSize: '1.05rem' }}>
              Claims are graded across five weighted dimensions. Scores above 70 earn{' '}
              <Box component="span" sx={{ color: FOREST_700, fontWeight: 700 }}>Green</Box>; 40–69 is{' '}
              <Box component="span" sx={{ color: AMBER, fontWeight: 700 }}>Amber</Box>; anything below is{' '}
              <Box component="span" sx={{ color: RED_ACC, fontWeight: 700 }}>Red</Box>.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {dimensions.map((d, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={d.label}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + idx * 0.06 }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: 'white',
                      border: '1px solid rgba(27,67,50,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      '&:hover': { borderColor: FOREST_300, transform: 'translateY(-4px)', boxShadow: '0 18px 40px -20px rgba(27,67,50,0.25)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={iconBadgeSx}>
                        <FontAwesomeIcon icon={d.icon} />
                      </Box>
                      <Chip
                        size="small"
                        label={`weight ${d.weight}`}
                        sx={{ bgcolor: FOREST_100, color: FOREST_800, fontWeight: 700, letterSpacing: 0.3 }}
                      />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: FOREST_900 }}>
                      {d.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(8,28,21,0.68)' }}>
                      {d.desc}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== FEATURES ===== */}
      <Box id="features" sx={{ bgcolor: FOREST_800, color: CREAM_50, py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.25,
            backgroundImage: `
              radial-gradient(circle at 20% 10%, rgba(116,198,157,0.25), transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(212,162,74,0.2), transparent 45%)
            `,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box sx={{ mb: 6, maxWidth: 680 }}>
            <Typography variant="overline" sx={{ color: FOREST_300, letterSpacing: 2, fontWeight: 700 }}>
              What you get
            </Typography>
            <Typography className="font-serif-display" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, mt: 1, lineHeight: 1.1 }}>
              Verdicts you can{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: FOREST_300 }}>
                defend
              </Box>
              {' '}— with receipts.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((f, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={f.title}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.25 + idx * 0.08 }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: CREAM_50,
                      transition: 'all 0.3s ease',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: FOREST_500,
                        color: FOREST_900,
                        display: 'grid',
                        placeItems: 'center',
                        mb: 2,
                      }}
                    >
                      <FontAwesomeIcon icon={f.icon} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 1 }}>
                      {f.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(248,245,239,0.75)', lineHeight: 1.6 }}>
                      {f.desc}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== CTA ===== */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: CREAM_50 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: FOREST_100,
              color: FOREST_800,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 3,
              fontSize: 24,
            }}
          >
            <FontAwesomeIcon icon={faLeaf} />
          </Box>
          <Typography
            className="font-serif-display"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: FOREST_900, lineHeight: 1.1 }}
          >
            Ready to audit your next{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: FOREST_700 }}>
              sustainability claim?
            </Box>
          </Typography>
          <Typography sx={{ color: 'rgba(8,28,21,0.68)', mt: 2, fontSize: '1.05rem' }}>
            Drop a PDF above and you'll have a full analysis — every claim, every quote — in minutes.
          </Typography>
          <Button
            variant="contained"
            disableElevation
            onClick={scrollToUpload}
            startIcon={<FontAwesomeIcon icon={faUpload} style={{ fontSize: 14 }} />}
            sx={{
              mt: 4,
              bgcolor: FOREST_800,
              color: CREAM_50,
              px: 4,
              py: 1.5,
              borderRadius: 999,
              fontSize: '1rem',
              fontWeight: 700,
              '&:hover': { bgcolor: FOREST_900 },
            }}
          >
            Start an analysis
          </Button>
        </Container>
      </Box>

      {/* ===== FOOTER ===== */}
      <Box sx={{ bgcolor: FOREST_900, color: 'rgba(248,245,239,0.7)', py: 5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                bgcolor: FOREST_700,
                display: 'grid',
                placeItems: 'center',
                color: CREAM_50,
              }}
            >
              <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 13 }} />
            </Box>
            <Typography sx={{ color: CREAM_50, fontWeight: 600 }}>
              Greenwash Detector
            </Typography>
          </Box>
          <Typography variant="caption">
            Built for Hack Knight · Gemini 2.5 Flash · pgvector RAG
          </Typography>
        </Container>
      </Box>

      {/* ===== RESET DIALOG ===== */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: RED_ACC, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <FontAwesomeIcon icon={faTriangleExclamation} />
          Reset all data?
        </DialogTitle>
        <DialogContent>
          <Box>
            <Typography variant="body1" gutterBottom>
              This will <strong>permanently delete</strong>:
            </Typography>
            <Box component="ul" sx={{ mt: 1.5, mb: 1.5, pl: 3 }}>
              <li>All uploaded documents</li>
              <li>All analyzed claims and evidence</li>
              <li>All PDF files</li>
              <li>All cached data</li>
            </Box>
            <Typography variant="body1">
              <strong>This action cannot be undone.</strong>
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Are you sure you want to continue?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setResetDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => resetMutation.mutate()}
            variant="contained"
            disableElevation
            disabled={resetMutation.isPending}
            sx={{ bgcolor: RED_ACC, '&:hover': { bgcolor: '#8a2f25' } }}
            startIcon={<FontAwesomeIcon icon={faTrashCan} />}
          >
            {resetMutation.isPending ? 'Resetting…' : 'Reset everything'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ---------- small helpers ---------- */

const navLinkSx = {
  color: FOREST_800,
  fontWeight: 600,
  fontSize: '0.95rem',
  textTransform: 'none',
  px: 0,
  minWidth: 0,
  '&:hover': { bgcolor: 'transparent', color: FOREST_700 },
} as const

const iconBadgeSx = {
  width: 40,
  height: 40,
  borderRadius: 2,
  bgcolor: FOREST_100,
  color: FOREST_800,
  display: 'grid',
  placeItems: 'center',
  fontSize: 16,
  flexShrink: 0,
} as const

function TrustItem({ icon, label }: { icon: any; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FontAwesomeIcon icon={icon} color={FOREST_700} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: '0 0 0 2px rgba(255,255,255,0.6) inset',
      }}
    />
  )
}
