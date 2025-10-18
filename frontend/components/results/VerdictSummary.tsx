'use client'

import { Box, Card, CardContent, Typography, Chip, LinearProgress, Paper, Grid } from '@mui/material'
import { CheckCircle, Warning, Error, TrendingDown, TrendingUp, Info } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { Claim } from '@/lib/api'

interface VerdictSummaryProps {
  claims: Claim[]
}

export function VerdictSummary({ claims }: VerdictSummaryProps) {
  // Calculate overall stats
  const totalClaims = claims.length
  const greenCount = claims.filter(c => c.overall_rating === 'green').length
  const amberCount = claims.filter(c => c.overall_rating === 'amber').length
  const redCount = claims.filter(c => c.overall_rating === 'red').length

  // Calculate average score across all claims
  const averageScore = Math.round(
    claims.reduce((sum, claim) => {
      const claimAvg = claim.scores.reduce((s, score) => s + score.value, 0) / claim.scores.length
      return sum + claimAvg
    }, 0) / totalClaims
  )

  // Determine overall verdict
  const getVerdict = () => {
    if (averageScore >= 70) {
      return {
        label: 'Low Greenwashing Risk',
        color: '#10b981',
        icon: <CheckCircle sx={{ fontSize: 60, color: '#10b981' }} />,
        bgcolor: '#d1fae5'
      }
    } else if (averageScore >= 40) {
      return {
        label: 'Moderate Concerns',
        color: '#f59e0b',
        icon: <Warning sx={{ fontSize: 60, color: '#f59e0b' }} />,
        bgcolor: '#fef3c7'
      }
    } else {
      return {
        label: 'High Greenwashing Risk',
        color: '#ef4444',
        icon: <Error sx={{ fontSize: 60, color: '#ef4444' }} />,
        bgcolor: '#fee2e2'
      }
    }
  }

  const verdict = getVerdict()

  // Analyze key concerns
  const keyInsights = []
  
  // Check scope coverage
  const scope3Coverage = claims.filter(c => 
    c.scope_covered && Array.isArray(c.scope_covered) && c.scope_covered.includes('S3')
  ).length
  if (scope3Coverage < totalClaims * 0.3) {
    keyInsights.push({
      icon: <TrendingDown sx={{ color: '#ef4444' }} />,
      text: 'Limited Scope 3 emissions coverage',
      severity: 'error'
    })
  }

  // Check offset dependency
  const avgOffsetScore = claims.reduce((sum, claim) => {
    const offsetScore = claim.scores.find(s => s.dimension === 'offset_dependency')
    return sum + (offsetScore?.value || 0)
  }, 0) / totalClaims
  
  if (avgOffsetScore < 50) {
    keyInsights.push({
      icon: <Warning sx={{ color: '#f59e0b' }} />,
      text: 'Heavy reliance on carbon offsets',
      severity: 'warning'
    })
  }

  // Check verifiability
  const avgVerifiability = claims.reduce((sum, claim) => {
    const verifyScore = claim.scores.find(s => s.dimension === 'verifiability')
    return sum + (verifyScore?.value || 0)
  }, 0) / totalClaims
  
  if (avgVerifiability < 60) {
    keyInsights.push({
      icon: <Info sx={{ color: '#3b82f6' }} />,
      text: 'Many claims lack specific baselines or targets',
      severity: 'info'
    })
  }

  // Positive insights
  if (greenCount > totalClaims * 0.5) {
    keyInsights.push({
      icon: <TrendingUp sx={{ color: '#10b981' }} />,
      text: 'Majority of claims have strong supporting evidence',
      severity: 'success'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card 
        elevation={3}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${verdict.color}15 0%, ${verdict.color}25 100%)`,
            p: 4
          }}
        >
          <Typography variant="h4" align="center" gutterBottom fontWeight="bold" color="text.primary">
            Overall Greenwashing Assessment
          </Typography>

          {/* Score Display */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Paper
              elevation={2}
              sx={{
                maxWidth: 400,
                mx: 'auto',
                my: 3,
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                bgcolor: verdict.bgcolor
              }}
            >
              <Box display="flex" justifyContent="center" mb={2}>
                {verdict.icon}
              </Box>
              
              <Typography variant="h2" fontWeight="bold" color={verdict.color} mb={1}>
                {averageScore}/100
              </Typography>
              
              <Chip
                label={verdict.label}
                sx={{
                  bgcolor: verdict.color,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  py: 2.5,
                  px: 1
                }}
              />
            </Paper>
          </motion.div>

          {/* Statistics */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  {totalClaims}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Claims Analyzed
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#d1fae5' }}>
                <Typography variant="h5" fontWeight="bold" color="#059669">
                  {greenCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🟢 Low Risk
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#fef3c7' }}>
                <Typography variant="h5" fontWeight="bold" color="#d97706">
                  {amberCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🟡 Moderate
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#fee2e2' }}>
                <Typography variant="h5" fontWeight="bold" color="#dc2626">
                  {redCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🔴 High Risk
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Key Insights */}
        {keyInsights.length > 0 && (
          <CardContent sx={{ bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom fontWeight="600" display="flex" alignItems="center">
              <Info sx={{ mr: 1 }} /> Key Insights
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              {keyInsights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ mr: 2 }}>{insight.icon}</Box>
                    <Typography variant="body1">{insight.text}</Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </CardContent>
        )}

        {/* Score Breakdown */}
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Dimension Breakdown
          </Typography>
          
          {['integrity', 'verifiability', 'scope_coverage', 'offset_dependency'].map((dimension, idx) => {
            const avgScore = Math.round(
              claims.reduce((sum, claim) => {
                const score = claim.scores.find(s => s.dimension === dimension)
                return sum + (score?.value || 0)
              }, 0) / totalClaims
            )

            const getColor = (score: number) => {
              if (score >= 70) return '#10b981'
              if (score >= 40) return '#f59e0b'
              return '#ef4444'
            }

            return (
              <motion.div
                key={dimension}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
              >
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body1" fontWeight="500" sx={{ textTransform: 'capitalize' }}>
                      {dimension.replace('_', ' ')}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color={getColor(avgScore)}>
                      {avgScore}/100
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={avgScore}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getColor(avgScore),
                        borderRadius: 5
                      }
                    }}
                  />
                </Box>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

