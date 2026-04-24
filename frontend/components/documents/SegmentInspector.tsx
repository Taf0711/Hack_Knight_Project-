'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  ButtonBase,
  Stack,
} from '@mui/material'
import { Article, MenuBook, AutoStories, OpenInNew } from '@mui/icons-material'
import {
  getDocumentSegments,
  DocumentSegment,
  DocumentSegmentsResponse,
} from '@/lib/api'
import { usePdfViewer } from '@/components/documents/PdfViewer'

interface SegmentInspectorProps {
  documentId: string
  documentTitle?: string
}

type TabKey = 'sections' | 'batches' | 'pages'

const TAB_ICONS: Record<TabKey, JSX.Element> = {
  sections: <MenuBook fontSize="small" />,
  batches: <AutoStories fontSize="small" />,
  pages: <Article fontSize="small" />,
}

function formatPageRange(segment: DocumentSegment): string {
  if (segment.page_start != null && segment.page_end != null) {
    return segment.page_start === segment.page_end
      ? `p. ${segment.page_start}`
      : `pp. ${segment.page_start}–${segment.page_end}`
  }
  if (segment.pages.length > 0) {
    const first = segment.pages[0]
    const last = segment.pages[segment.pages.length - 1]
    return first === last ? `p. ${first}` : `pp. ${first}–${last}`
  }
  return '—'
}

export function SegmentInspector({ documentId, documentTitle }: SegmentInspectorProps) {
  const pdfViewer = usePdfViewer()
  const [tab, setTab] = useState<TabKey>('sections')

  const { data, isLoading, isError } = useQuery<DocumentSegmentsResponse>({
    queryKey: ['document-segments', documentId],
    queryFn: () => getDocumentSegments(documentId, false),
    staleTime: 60_000,
  })

  const activeSegments: DocumentSegment[] = useMemo(() => {
    if (!data) return []
    if (tab === 'sections') return data.sections ?? []
    if (tab === 'batches') return data.extraction_batches ?? []
    return data.pages ?? []
  }, [data, tab])

  const handleOpen = (segment: DocumentSegment) => {
    const page =
      segment.page_start ?? (segment.pages.length > 0 ? segment.pages[0] : undefined)
    if (page == null) return
    pdfViewer.open({
      documentId,
      page,
      title: documentTitle,
    })
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress size={36} />
      </Box>
    )
  }

  if (isError || !data) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        Could not load document structure. The document may still be processing.
      </Alert>
    )
  }

  const counts = {
    sections: data.sections?.length ?? 0,
    batches: data.extraction_batches?.length ?? 0,
    pages: data.pages?.length ?? 0,
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1b4332' }}>
            Document Structure
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.total_pages} pages · {counts.sections} sections · {counts.batches} extraction batches
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, next) => setTab(next as TabKey)}
        sx={{
          mb: 2,
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: '#1b4332 !important' },
          '& .MuiTabs-indicator': { bgcolor: '#1b4332' },
        }}
      >
        <Tab
          value="sections"
          label={`Sections (${counts.sections})`}
          icon={TAB_ICONS.sections}
          iconPosition="start"
        />
        <Tab
          value="batches"
          label={`Extraction batches (${counts.batches})`}
          icon={TAB_ICONS.batches}
          iconPosition="start"
        />
        <Tab
          value="pages"
          label={`Pages (${counts.pages})`}
          icon={TAB_ICONS.pages}
          iconPosition="start"
        />
      </Tabs>

      {activeSegments.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No {tab} available for this document.
        </Alert>
      ) : (
        <Stack spacing={1}>
          {activeSegments.map((segment, segmentIdx) => {
            const canOpen =
              segment.page_start != null || segment.pages.length > 0
            return (
              <ButtonBase
                key={`${segment.segment_id}-${segmentIdx}`}
                onClick={canOpen ? () => handleOpen(segment) : undefined}
                disabled={!canOpen}
                sx={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 2,
                  '&:focus-visible': {
                    outline: '2px solid #2d6a4f',
                    outlineOffset: 2,
                  },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: '4px solid',
                    borderLeftColor: '#2d6a4f',
                    borderRadius: 2,
                    transition: 'background-color 0.18s ease, transform 0.18s ease',
                    '&:hover': canOpen
                      ? {
                          bgcolor: '#e7f4ec',
                          transform: 'translateX(2px)',
                        }
                      : undefined,
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary' }}>
                      {segment.title || 'Untitled'}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <Chip
                        size="small"
                        label={formatPageRange(segment)}
                        sx={{ height: 22, fontSize: '0.7rem', bgcolor: '#d1fae5', color: '#065f46', fontWeight: 600 }}
                      />
                      <Chip
                        size="small"
                        label={`${segment.char_count.toLocaleString()} chars`}
                        sx={{ height: 22, fontSize: '0.7rem' }}
                        variant="outlined"
                      />
                      {canOpen && (
                        <Box display="flex" alignItems="center" gap={0.3} sx={{ color: '#2d6a4f' }}>
                          <OpenInNew sx={{ fontSize: 14 }} />
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                            Open
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {segment.preview && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {segment.preview}
                    </Typography>
                  )}
                </Paper>
              </ButtonBase>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
