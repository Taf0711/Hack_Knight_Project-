'use client'

import { Box, Paper, Typography, Stepper, Step, StepLabel, LinearProgress, CircularProgress } from '@mui/material'
import { CheckCircle, Circle, Pending } from '@mui/icons-material'
import { motion } from 'framer-motion'

export type ProcessingStage = 
  | 'pdf_processing'
  | 'creating_embeddings'
  | 'extracting_claims'
  | 'analyzing_evidence'
  | 'complete'

interface ProgressTrackerProps {
  currentStage: ProcessingStage
  progress?: number
  claimsFound?: number
  claimsAnalyzed?: number
}

const stages = [
  {
    id: 'pdf_processing',
    label: 'PDF Processing',
    description: 'Extracting text from document',
    estimatedTime: '10s'
  },
  {
    id: 'creating_embeddings',
    label: 'Creating Embeddings',
    description: 'Chunking and vectorizing text',
    estimatedTime: '30-60s'
  },
  {
    id: 'extracting_claims',
    label: 'Extracting Claims',
    description: 'AI identifying sustainability claims',
    estimatedTime: '20-30s'
  },
  {
    id: 'analyzing_evidence',
    label: 'Analyzing Evidence',
    description: 'Finding supporting/contradicting evidence',
    estimatedTime: '60-90s'
  },
  {
    id: 'complete',
    label: 'Complete!',
    description: 'Analysis ready',
    estimatedTime: '0s'
  }
]

export function ProgressTracker({ currentStage, progress = 0, claimsFound, claimsAnalyzed }: ProgressTrackerProps) {
  const currentStageIndex = stages.findIndex(s => s.id === currentStage)
  const overallProgress = ((currentStageIndex + 1) / stages.length) * 100

  const getStepIcon = (stageId: string, index: number) => {
    if (index < currentStageIndex) {
      return <CheckCircle sx={{ color: '#10b981', fontSize: 32 }} />
    } else if (index === currentStageIndex) {
      return <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
    } else {
      return <Circle sx={{ color: '#d1d5db', fontSize: 32 }} />
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Analyzing Document
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This may take 1-3 minutes depending on document size
            </Typography>
          </Box>

          {/* Overall Progress */}
          <Box mb={4}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight="600">
                Overall Progress
              </Typography>
              <Typography variant="body2" fontWeight="600" color="primary">
                {Math.round(overallProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 12,
                borderRadius: 6,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            />
          </Box>

          {/* Stage Progress */}
          <Stepper activeStep={currentStageIndex} orientation="vertical">
            {stages.map((stage, index) => {
              const isActive = index === currentStageIndex
              const isComplete = index < currentStageIndex

              return (
                <Step key={stage.id} completed={isComplete}>
                  <StepLabel
                    StepIconComponent={() => getStepIcon(stage.id, index)}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '1.1rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'primary.main' : isComplete ? 'success.main' : 'text.secondary'
                      }
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Typography variant="h6" fontWeight={isActive ? 'bold' : 'normal'}>
                        {stage.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stage.description}
                      </Typography>
                      {!isComplete && (
                        <Typography variant="caption" color="text.disabled">
                          Est. {stage.estimatedTime}
                        </Typography>
                      )}
                      
                      {/* Stage-specific details */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <Box mt={2} mb={3}>
                            {stage.id === 'analyzing_evidence' && claimsFound && (
                              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                <Typography variant="body2" color="primary" fontWeight="600">
                                  {claimsFound} claims found
                                </Typography>
                                {claimsAnalyzed !== undefined && (
                                  <Box mt={1}>
                                    <Typography variant="caption" color="text.secondary">
                                      Analyzed: {claimsAnalyzed} / {claimsFound}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={(claimsAnalyzed / claimsFound) * 100}
                                      sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                                    />
                                  </Box>
                                )}
                              </Paper>
                            )}
                            
                            {stage.id !== 'analyzing_evidence' && (
                              <Box display="flex" alignItems="center" gap={1}>
                                <CircularProgress size={16} />
                                <Typography variant="body2" color="primary">
                                  Processing...
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </motion.div>
                      )}

                      {isComplete && (
                        <Box mt={1} display="flex" alignItems="center" gap={0.5}>
                          <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
                          <Typography variant="caption" color="success.main" fontWeight="600">
                            Complete
                          </Typography>
                        </Box>
                      )}
                    </motion.div>
                  </StepLabel>
                </Step>
              )
            })}
          </Stepper>

          {/* Completion Message */}
          {currentStage === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#d1fae5',
                  borderRadius: 2
                }}
              >
                <CheckCircle sx={{ fontSize: 60, color: '#10b981', mb: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="#059669">
                  Analysis Complete!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Redirecting to results...
                </Typography>
              </Paper>
            </motion.div>
          )}
        </Paper>
      </motion.div>
    </Box>
  )
}

