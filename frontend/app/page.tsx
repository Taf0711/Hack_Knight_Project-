'use client'

import { useState } from 'react'
import { Container, Box, Typography, Grid, Paper, Card, CardContent } from '@mui/material'
import { Upload, Search, Balance, Traffic } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { DocumentUpload } from '@/components/upload/DocumentUpload'
import { DocumentList } from '@/components/documents/DocumentList'

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const features = [
    {
      icon: <Upload sx={{ fontSize: 48 }} />,
      title: '1. Upload',
      description: 'Upload your sustainability report PDF',
      color: '#667eea'
    },
    {
      icon: <Search sx={{ fontSize: 48 }} />,
      title: '2. Extract',
      description: 'AI extracts environmental claims',
      color: '#764ba2'
    },
    {
      icon: <Balance sx={{ fontSize: 48 }} />,
      title: '3. Verify',
      description: 'Evidence is gathered and analyzed',
      color: '#f093fb'
    },
    {
      icon: <Traffic sx={{ fontSize: 48 }} />,
      title: '4. Rate',
      description: 'Get traffic-light ratings with citations',
      color: '#10b981'
    }
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
            <Box textAlign="center" sx={{ position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  color: 'white',
                  mb: 2,
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                Greenwash Detector
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255,255,255,0.95)',
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 4,
                  fontWeight: 400,
                  fontSize: { xs: '1.1rem', md: '1.5rem' }
                }}
              >
                AI-Powered Analysis of Sustainability Reports
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  maxWidth: 700,
                  mx: 'auto',
                  fontSize: { xs: '1rem', md: '1.1rem' }
                }}
              >
                Upload a PDF sustainability report to detect potential greenwashing with
                citation-backed evidence and multi-dimensional scoring.
              </Typography>
            </Box>
          </motion.div>
        </Container>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid item xs={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight="700" gutterBottom color="primary">
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
          <Grid item xs={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight="700" gutterBottom color="primary">
                    Recent Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Your uploaded sustainability reports
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
            elevation={2}
            sx={{
              mt: 6,
              p: 5,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
            }}
          >
            <Typography
              variant="h4"
              fontWeight="700"
              textAlign="center"
              gutterBottom
              color="primary.dark"
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

            <Grid container spacing={3}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <Paper
                      elevation={1}
                      sx={{
                        p: 3,
                        height: '100%',
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: 'white',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: 4,
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
              <Grid item xs={12} md={4} key={idx}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 2,
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateX(4px)'
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
    </Box>
  )
}
