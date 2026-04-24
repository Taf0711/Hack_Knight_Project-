'use client'

import { useState, useMemo, memo } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Typography,
  LinearProgress,
  Paper,
  Grid,
  Divider,
  ButtonBase,
} from '@mui/material'
import {
  ExpandMore,
  CheckCircle,
  Warning,
  Error,
  VerifiedUser,
  GppMaybe,
  Psychology,
  OpenInNew,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { Claim, Citation, Evidence } from '@/lib/api'
import { usePdfViewer } from '@/components/documents/PdfViewer'

interface ClaimsListProps {
  claims: Claim[]
  documentId: string
  documentTitle?: string
}

const ClaimItem = memo(({ claim, isExpanded, handleChange, getRatingConfig, getStanceConfig, onOpenCitation }: any) => {
  const rating = getRatingConfig(claim.overall_rating)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
    >
      <Accordion
        expanded={isExpanded}
        onChange={handleChange(claim.id)}
        sx={{
          mb: 2,
          borderRadius: 2,
          '&:before': { display: 'none' },
          boxShadow: '0 8px 20px rgba(2,6,23,0.06)',
          overflow: 'hidden',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': { transform: 'translateY(-4px)' }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: rating.bgcolor,
            '&:hover': {
              bgcolor: rating.bgcolor,
              opacity: 0.9
            },
            '& .MuiAccordionSummary-content': {
              my: 2
            }
          }}
        >
          <Box sx={{ width: '100%', pr: 2 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="wrap">
              <Box display="flex" alignItems="center" sx={{ color: rating.color }}>
                {rating.icon}
              </Box>
              
              <Chip
                label={rating.label}
                sx={{
                  bgcolor: rating.color,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}
              />
              
              {claim.claim_type && (
                <Chip
                  label={claim.claim_type.toUpperCase()}
                  size="small"
                  variant="outlined"
                />
              )}
              
              {claim.topic && (
                <Chip
                  label={claim.topic.replace('_', ' ').toUpperCase()}
                  size="small"
                  variant="outlined"
                />
              )}
              
              {claim.page && (
                <Typography variant="caption" color="text.secondary">
                  Page {claim.page}
                </Typography>
              )}
            </Box>

            <Typography variant="body1" fontWeight={500} sx={{ color: 'text.primary' }}>
              {claim.claim_text}
            </Typography>

            {(claim.target_year || claim.numeric_value) && (
              <Box mt={1.5} display="flex" gap={2} flexWrap="wrap">
                {claim.numeric_value && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Target:</strong> {claim.numeric_value}{claim.units}
                  </Typography>
                )}
                {claim.target_year && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Year:</strong> {claim.target_year}
                  </Typography>
                )}
                {claim.baseline_year && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Baseline:</strong> {claim.baseline_year}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 3, bgcolor: 'grey.50' }}>
          {/* Dimension Scores */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Dimension Scores
            </Typography>
            <Grid container spacing={2}>
              {claim.scores.map((score: any, idx: number) => {
                const getScoreColor = (value: number) => {
                  if (value >= 70) return '#10b981'
                  if (value >= 40) return '#f59e0b'
                  return '#ef4444'
                }

                const scoreColor = getScoreColor(score.value)

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={idx}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                          {score.dimension.replace('_', ' ')}
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: scoreColor }}>
                          {score.value.toFixed(0)}/100
                        </Typography>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={score.value}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: scoreColor,
                            borderRadius: 4
                          }
                        }}
                      />
                      
                      {score.explanation && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          {score.explanation}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Evidence Analysis */}
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Evidence Analysis
            </Typography>
            
            {claim.evidence.map((evidence: Evidence, idx: number) => {
              const stanceConfig = getStanceConfig(evidence.stance)
              const citations = evidence.citations || []
              const reasoningSteps = evidence.reasoning_steps || []

              return (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    mb: 2,
                    bgcolor: 'white',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
                    <Chip
                      label={stanceConfig.label}
                      color={stanceConfig.color as any}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />

                    {evidence.strength !== undefined && evidence.strength !== null && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Strength:
                        </Typography>
                        <Box display="flex" gap={0.3}>
                          {[1, 2, 3].map((level) => (
                            <Box
                              key={level}
                              sx={{
                                width: 8,
                                height: 16,
                                bgcolor: level <= (evidence.strength ?? 0) ? '#10b981' : '#e5e7eb',
                                borderRadius: 1
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="caption" fontWeight="600">
                          {evidence.strength}/3
                        </Typography>
                      </Box>
                    )}

                    {evidence.confidence !== undefined && evidence.confidence !== null && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Confidence:
                        </Typography>
                        <Box display="flex" gap={0.3}>
                          {[1, 2, 3].map((level) => (
                            <Box
                              key={level}
                              sx={{
                                width: 8,
                                height: 16,
                                bgcolor: level <= (evidence.confidence ?? 0) ? '#3b82f6' : '#e5e7eb',
                                borderRadius: 1
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="caption" fontWeight="600">
                          {evidence.confidence}/3
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {evidence.rationale && (
                    <Typography variant="body2" color="text.primary" paragraph>
                      {evidence.rationale}
                    </Typography>
                  )}

                  {reasoningSteps.length > 0 && (
                    <Accordion
                      elevation={0}
                      sx={{
                        mt: 1,
                        mb: 1,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        '&:before': { display: 'none' }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Psychology fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" fontWeight="600" color="text.secondary">
                            Reasoning steps ({reasoningSteps.length})
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                          {reasoningSteps.map((step, stepIdx) => (
                            <Typography
                              component="li"
                              key={stepIdx}
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'list-item', mb: 0.5 }}
                            >
                              {step}
                            </Typography>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {citations.length > 0 && (
                    <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
                      <Typography variant="caption" fontWeight="600" color="text.secondary" display="block" mb={1}>
                        Citations:
                      </Typography>
                      {citations.map((citation: Citation, citIdx: number) => {
                        const verified = citation.validation?.verified === true
                        const hasValidation = citation.validation != null
                        const similarity = citation.validation?.similarity
                        const borderColor = hasValidation
                          ? verified
                            ? '#10b981'
                            : '#f59e0b'
                          : '#2d6a4f'
                        const canOpen = citation.page != null

                        return (
                          <ButtonBase
                            key={citIdx}
                            onClick={canOpen ? () => onOpenCitation(citation) : undefined}
                            disabled={!canOpen}
                            sx={{
                              width: '100%',
                              display: 'block',
                              textAlign: 'left',
                              mb: 1,
                              borderRadius: 1,
                              cursor: canOpen ? 'pointer' : 'default',
                              '&:focus-visible': {
                                outline: '2px solid #2d6a4f',
                                outlineOffset: 2,
                              },
                            }}
                          >
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1.5,
                                bgcolor: 'grey.50',
                                borderLeft: '3px solid',
                                borderColor,
                                borderRadius: 1,
                                transition: 'background-color 0.18s ease, transform 0.18s ease',
                                '&:hover': canOpen
                                  ? {
                                      bgcolor: '#e7f4ec',
                                      transform: 'translateX(2px)',
                                    }
                                  : undefined,
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
                                {citation.page != null && (
                                  <Typography variant="caption" fontWeight="600" color="primary">
                                    Page {citation.page}
                                  </Typography>
                                )}
                                {hasValidation && (
                                  <Chip
                                    size="small"
                                    icon={
                                      verified ? (
                                        <VerifiedUser sx={{ fontSize: 14 }} />
                                      ) : (
                                        <GppMaybe sx={{ fontSize: 14 }} />
                                      )
                                    }
                                    label={
                                      verified
                                        ? 'Verified'
                                        : typeof similarity === 'number'
                                        ? `Unverified (${Math.round(similarity * 100)}% match)`
                                        : 'Unverified'
                                    }
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      bgcolor: verified ? '#d1fae5' : '#fef3c7',
                                      color: verified ? '#065f46' : '#92400e',
                                      '& .MuiChip-icon': {
                                        color: verified ? '#065f46' : '#92400e',
                                      },
                                    }}
                                  />
                                )}
                                {citation.passage_id && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    #{String(citation.passage_id).slice(0, 8)}
                                  </Typography>
                                )}
                                {canOpen && (
                                  <Box display="flex" alignItems="center" gap={0.3} sx={{ ml: 'auto', color: '#2d6a4f' }}>
                                    <OpenInNew sx={{ fontSize: 14 }} />
                                    <Typography variant="caption" fontWeight="600" sx={{ fontSize: '0.65rem' }}>
                                      Open source
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                              {citation.snippet && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  &quot;{citation.snippet}&quot;
                                </Typography>
                              )}
                              {hasValidation && !verified && citation.validation?.reason && (
                                <Typography
                                  variant="caption"
                                  color="warning.main"
                                  display="block"
                                  mt={0.5}
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  {citation.validation.reason}
                                </Typography>
                              )}
                            </Paper>
                          </ButtonBase>
                        )
                      })}
                    </Box>
                  )}
                </Paper>
              )
            })}
          </Box>
        </AccordionDetails>
      </Accordion>
    </motion.div>
  )
})

ClaimItem.displayName = 'ClaimItem'

export function ClaimsList({ claims, documentId, documentTitle }: ClaimsListProps) {
  const [expanded, setExpanded] = useState<string | false>(false)
  const pdfViewer = usePdfViewer()

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const handleOpenCitation = (citation: Citation) => {
    if (citation.page == null) return
    pdfViewer.open({
      documentId,
      page: citation.page,
      title: documentTitle,
    })
  }

  const getRatingConfig = useMemo(() => (rating: 'red' | 'amber' | 'green') => {
    switch (rating) {
      case 'green':
        return {
          icon: <CheckCircle sx={{ fontSize: 28 }} />,
          color: '#10b981',
          bgcolor: '#d1fae5',
          label: 'LOW RISK'
        }
      case 'amber':
        return {
          icon: <Warning sx={{ fontSize: 28 }} />,
          color: '#f59e0b',
          bgcolor: '#fef3c7',
          label: 'MODERATE'
        }
      case 'red':
        return {
          icon: <Error sx={{ fontSize: 28 }} />,
          color: '#ef4444',
          bgcolor: '#fee2e2',
          label: 'HIGH RISK'
        }
    }
  }, [])

  const getStanceConfig = useMemo(() => (stance: string | null | undefined) => {
    switch (stance) {
      case 'supports':
        return { color: 'success', label: 'SUPPORTS' }
      case 'contradicts':
        return { color: 'error', label: 'CONTRADICTS' }
      default:
        return { color: 'default', label: 'INSUFFICIENT' }
    }
  }, [])

  return (
    <Box>
      {claims.map((claim) => (
        <ClaimItem
          key={claim.id}
          claim={claim}
          isExpanded={expanded === claim.id}
          handleChange={handleChange}
          getRatingConfig={getRatingConfig}
          getStanceConfig={getStanceConfig}
          onOpenCitation={handleOpenCitation}
        />
      ))}
    </Box>
  )
}
