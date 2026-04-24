'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Tooltip,
} from '@mui/material'
import { Close, OpenInNew } from '@mui/icons-material'
import { getDocumentFileUrl } from '@/lib/api'

interface PdfViewerState {
  documentId: string
  page?: number
  title?: string
}

interface PdfViewerContextValue {
  open: (args: PdfViewerState) => void
  close: () => void
  isOpen: boolean
  state: PdfViewerState | null
}

const PdfViewerContext = createContext<PdfViewerContextValue | null>(null)

export function usePdfViewer() {
  const ctx = useContext(PdfViewerContext)
  if (!ctx) {
    throw new Error('usePdfViewer must be used inside PdfViewerProvider')
  }
  return ctx
}

export function PdfViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PdfViewerState | null>(null)

  const open = useCallback((args: PdfViewerState) => setState(args), [])
  const close = useCallback(() => setState(null), [])

  const value = useMemo(
    () => ({ open, close, isOpen: state != null, state }),
    [open, close, state]
  )

  return (
    <PdfViewerContext.Provider value={value}>
      {children}
      <PdfViewerDialog />
    </PdfViewerContext.Provider>
  )
}

function PdfViewerDialog() {
  const { state, close } = usePdfViewer()

  if (!state) return null

  const src = getDocumentFileUrl(state.documentId, state.page)
  const openInNewTab = getDocumentFileUrl(state.documentId, state.page)

  return (
    <Dialog
      open={true}
      onClose={close}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.25,
          px: 2,
          bgcolor: '#1b4332',
          color: 'white',
        }}
      >
        <Box display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.1 }}>
            {state.title || 'Source document'}
          </Typography>
          {typeof state.page === 'number' && (
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Jumped to page {state.page}
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Open in new tab">
            <Button
              size="small"
              href={openInNewTab}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNew fontSize="small" />}
              sx={{
                color: 'white',
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              New tab
            </Button>
          </Tooltip>
          <IconButton
            onClick={close}
            size="small"
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', bgcolor: '#f3f4f6' }}>
        <Box
          component="iframe"
          key={src}
          src={src}
          title="PDF viewer"
          sx={{ width: '100%', height: '100%', border: 0 }}
        />
      </DialogContent>
    </Dialog>
  )
}
