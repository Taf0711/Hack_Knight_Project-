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
  Divider
} from '@mui/material'
import { ExpandMore, CheckCircle, Warning, Error } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { Claim } from '@/lib/api'

interface ClaimsListProps {
  claims: Claim[]
}

const ClaimItem = memo(({ claim, isExpanded, handleChange, getRatingConfig, getStanceConfig }: any) => {
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
                  <Grid xs={12} md={6} key={idx}>
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
            
            {claim.evidence.map((evidence: any, idx: number) => {
              const stanceConfig = getStanceConfig(evidence.stance)

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
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Chip
                      label={stanceConfig.label}
                      color={stanceConfig.color as any}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    
                    {evidence.strength !== undefined && evidence.strength !== null && (
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
                                bgcolor: level <= evidence.strength! ? '#10b981' : '#e5e7eb',
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
                  </Box>

                  {evidence.rationale && (
                    <Typography variant="body2" color="text.primary" paragraph>
                      {evidence.rationale}
                    </Typography>
                  )}

                  {evidence.citations && evidence.citations.length > 0 && (
                    <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
                      <Typography variant="caption" fontWeight="600" color="text.secondary" display="block" mb={1}>
                        Citations:
                      </Typography>
                      {evidence.citations.map((citation: any, citIdx: number) => (
                        <Paper
                          key={citIdx}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            mb: 1,
                            bgcolor: 'grey.50',
                            borderLeft: '3px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1
                          }}
                        >
                          {citation.page && (
                            <Typography variant="caption" fontWeight="600" color="primary" display="block" mb={0.5}>
                              Page {citation.page}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            "{citation.snippet}"
                          </Typography>
                        </Paper>
                      ))}
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

export function ClaimsList({ claims }: ClaimsListProps) {
  const [expanded, setExpanded] = useState<string | false>(false)

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
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
        />
      ))}
    </Box>
  )
}
