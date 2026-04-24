'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  AlertTitle,
  Fade,
  Zoom
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Description
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadDocument } from '@/lib/api'

interface DocumentUploadProps {
  onSuccess?: () => void
  autoNavigate?: boolean
}

export function DocumentUpload({ onSuccess, autoNavigate = true }: DocumentUploadProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fileName, setFileName] = useState<string>('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setFileName(file.name)
    setUploading(true)
    setError(null)
    setSuccess(false)
    setProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const response = await uploadDocument(file, {
        title: file.name.replace('.pdf', ''),
      })
      
      clearInterval(progressInterval)
      setProgress(100)
      setSuccess(true)
      
      if (onSuccess) {
        onSuccess()
      }
      
      // Auto-navigate to document page after short delay
      if (autoNavigate && response?.id) {
        setTimeout(() => {
          router.push(`/documents/${response.id}`)
        }, 1500)
      } else {
        // If not auto-navigating, reset after delay
        setTimeout(() => {
          setSuccess(false)
          setProgress(0)
          setFileName('')
        }, 4000)
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }, [onSuccess, autoNavigate, router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <Box>
      <Paper
        {...getRootProps()}
        elevation={isDragActive ? 8 : 2}
        sx={{
          p: { xs: 3, md: 5 },
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'primary.50' : 'grey.50',
          borderRadius: 3,
          transition: 'all 0.25s ease',
          opacity: uploading ? 0.9 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          '&:hover': {
            borderColor: uploading ? 'grey.300' : 'primary.light',
            bgcolor: uploading ? 'grey.50' : 'primary.50',
            transform: uploading ? 'none' : 'translateY(-4px)',
          }
        }}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Box sx={{ width: '100%' }}>
                <CloudUpload sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} className="animate-pulse-slow" />
                <Typography variant="h6" color="primary" gutterBottom>
                  Uploading {fileName}...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Processing document and creating embeddings
                </Typography>
                <Box sx={{ width: { xs: '100%', md: '70%' }, mx: 'auto', mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 6,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: 'linear-gradient(90deg, #2d6a4f 0%, #74c69d 100%)'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    {progress}%
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Zoom in={true}>
              <Box>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} className="animate-bounce-subtle" />
                <Typography variant="h6" color="success.main" gutterBottom>
                  Upload Successful!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {autoNavigate ? 'Redirecting to analysis...' : `${fileName} is ready for analysis`}
                </Typography>
              </Box>
              </Zoom>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Box>
                <CloudUpload
                  sx={{
                    fontSize: 48,
                    color: isDragActive ? 'primary.main' : 'grey.400',
                    mb: 1,
                    transition: 'all 0.2s ease'
                  }}
                />
                {isDragActive ? (
                  <Typography variant="h6" color="primary" fontWeight={600}>
                    Drop your PDF here...
                  </Typography>
                ) : (
                  <>
                    <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
                      Drop a PDF file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                      Maximum file size: 50MB
                    </Typography>
                  </>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Paper>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <Fade in={true}>
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              onClose={() => setError(null)}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              <AlertTitle>Upload Failed</AlertTitle>
              {error}
            </Alert>
          </Fade>
        )}
      </AnimatePresence>

      {/* Success Message (redundant with in-place success, but keeps consistency) */}
      <AnimatePresence>
        {success && !uploading && (
          <Fade in={true}>
            <Alert
              severity="success"
              icon={<Description />}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              <AlertTitle>Success!</AlertTitle>
              Document uploaded successfully. {autoNavigate ? 'Redirecting to analysis page...' : 'Ready for analysis!'}
            </Alert>
          </Fade>
        )}
      </AnimatePresence>
    </Box>
  )
}
