'use client'

import { useState, useCallback } from 'react'
import { Container, Box, Typography, Paper, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid'
import { Upload, Search, Balance, Traffic, DeleteSweep } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DocumentUpload } from '@/components/upload/DocumentUpload'
import { DocumentList } from '@/components/documents/DocumentList'
import { resetDatabase } from '@/lib/api'

export default function HomePage() {
  const queryClient = useQueryClient()
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const resetMutation = useMutation({
    mutationFn: resetDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setRefreshKey(prev => prev + 1)
      setResetDialogOpen(false)
    },
  })

  const scrollToUpload = useCallback(() => {
    const el = document.getElementById('upload-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const features = [
    {
      icon: <Upload sx={{ fontSize: 48 }} />,
      title: '1. Upload',
      description: 'Upload your sustainability report PDF',
      color: '#2d6a4f'
    },
    {
      icon: <Search sx={{ fontSize: 48 }} />,
      title: '2. Extract',
      description: 'AI extracts environmental claims',
      color: '#40916c'
    },
    {
      icon: <Balance sx={{ fontSize: 48 }} />,
      title: '3. Verify',
      description: 'Evidence is gathered and analyzed',
      color: '#52b788'
    },
    {
      icon: <Traffic sx={{ fontSize: 48 }} />,
      title: '4. Rate',
      description: 'Get traffic-light ratings with citations',
      color: '#74c69d'
    }
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: '#2d6a4f', // Matte environmental green
          py: 8,
          mb: 6,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid xs={12} md={7}>
                  <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        color: 'white',
                        mb: 2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        fontSize: { xs: '2rem', md: '3.5rem' }
                      }}
                    >
                      Greenwash Detector
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        color: 'rgba(255,255,255,0.95)',
                        maxWidth: 800,
                        mb: 3,
                        fontWeight: 400,
                        fontSize: { xs: '1rem', md: '1.25rem' }
                      }}
                    >
                      AI-Powered Analysis of Sustainability Reports
                    </Typography>

                    <Typography
                      variant="body1"
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        maxWidth: 650,
                        mb: 4,
                        fontSize: { xs: '0.95rem', md: '1.05rem' }
                      }}
                    >
                      Upload a PDF sustainability report to detect potential greenwashing with
                      citation-backed evidence and multi-dimensional scoring.
                    </Typography>

                           <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, gap: 2, mt: 1 }}>
                             <Button
                               variant="contained"
                               size="large"
                               sx={{
                                 background: '#1b4332', // Darker green
                                 px: 4,
                                 py: 1.5,
                                 fontWeight: 700,
                                 boxShadow: 'none',
                                 '&:hover': {
                                   background: '#081c15', // Even darker on hover
                                   transform: 'translateY(-2px)',
                                   boxShadow: 'none'
                                 }
                               }}
                               onClick={scrollToUpload}
                             >
                               Upload & Analyze
                             </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        sx={{ 
                          px: 3, 
                          py: 1.5, 
                          color: 'white', 
                          borderColor: 'rgba(255,255,255,0.5)',
                          '&:hover': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255,255,255,0.1)'
                          }
                        }}
                        onClick={() => window.open('/DEMO.md', '_blank')}
                      >
                        Demo & Docs
                      </Button>
                    </Box>

                    <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.85)', mt: 2 }}>
                      Processing typically takes 1-2 minutes depending on document size.
                    </Typography>
                  </Box>
                </Grid>

                <Grid xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
                  {/* Decorative illustration placeholder */}
                  <Box sx={{ width: '100%', height: 220, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
                </Grid>
              </Grid>
            </Box>
          </motion.div>
        </Container>

        {/* Removed decorative grid pattern */}
      </Box>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid xs={12} lg={6} id="upload-section">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'transform 0.3s ease',
                  border: '1px solid',
                  borderColor: '#d8f3dc',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: '#b7e4c7',
                    boxShadow: 'none'
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: '#2d6a4f' }}>
                    Upload Document
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Drag and drop your sustainability report or click to browse
                  </Typography>
                  <DocumentUpload onSuccess={handleUploadSuccess} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Documents List */}
          <Grid xs={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'transform 0.3s ease',
                  border: '1px solid',
                  borderColor: '#d8f3dc',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: '#b7e4c7',
                    boxShadow: 'none'
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#2d6a4f' }}>
                      Previous Reports
                    </Typography>
                    <Tooltip title="Clear all reports and start fresh">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => setResetDialogOpen(true)}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: 'error.lighter',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <DeleteSweep />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    View and analyze your uploaded sustainability reports
                  </Typography>
                  <DocumentList key={refreshKey} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Paper
            elevation={0}
            sx={{
              mt: 6,
              p: 5,
              borderRadius: 4,
              background: '#d8f3dc', // Light matte green
              boxShadow: 'none',
            }}
          >
            <Typography
              variant="h4"
              fontWeight="700"
              textAlign="center"
              gutterBottom
              sx={{ color: '#1b4332' }} // Dark green
            >
              How It Works
            </Typography>
            <Typography
              variant="body1"
              textAlign="center"
              color="text.secondary"
              sx={{ mb: 5, maxWidth: 700, mx: 'auto' }}
            >
              Our AI-powered system analyzes sustainability reports in four simple steps
            </Typography>

            <Grid container spacing={3} sx={{ justifyContent: 'center', alignItems: 'stretch' }}>
              {features.map((feature, index) => (
                <Grid xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    style={{ height: '100%' }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        height: '100%',
                        minHeight: 220,
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: 'white',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        border: '1px solid',
                        borderColor: '#b7e4c7',
                        boxShadow: 'none',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          borderColor: '#74c69d',
                          boxShadow: 'none',
                        }
                      }}
                    >
                      <Box
                        sx={{
                          color: feature.color,
                          mb: 2,
                          display: 'flex',
                          justifyContent: 'center'
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: feature.color }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {[
              { title: 'Multi-Dimensional Scoring', desc: 'Integrity, verifiability, scope coverage, and offset dependency' },
              { title: 'Citation-Backed', desc: 'Every assessment includes quotes from the original document' },
              { title: 'Traffic-Light Ratings', desc: 'Clear Green/Amber/Red verdicts for quick assessment' },
            ].map((item, idx) => (
              <Grid xs={12} md={4} key={idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 2,
                    borderLeft: '4px solid',
                    borderColor: '#2d6a4f',
                    transition: 'all 0.3s ease',
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'none',
                      transform: 'translateX(4px)',
                      borderColor: '#1b4332'
                    }
                  }}
                >
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          ⚠️ Reset All Data?
        </DialogTitle>
        <DialogContent>
          <Box>
            <Typography variant="body1" gutterBottom>
              This will <strong>permanently delete</strong>:
            </Typography>
            <ul style={{ marginTop: '12px', marginBottom: '12px' }}>
              <li>All uploaded documents</li>
              <li>All analyzed claims and evidence</li>
              <li>All PDF files</li>
              <li>All cached data</li>
            </ul>
            <Typography variant="body1">
              <strong>This action cannot be undone.</strong>
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Are you sure you want to continue?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => resetMutation.mutate()}
            color="error"
            variant="contained"
            disabled={resetMutation.isPending}
            startIcon={<DeleteSweep />}
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Everything'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
