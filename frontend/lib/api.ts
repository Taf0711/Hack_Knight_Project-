import axios from 'axios'

const BACKEND_API =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

// Single backend-facing client. The previous split between a proxied `api`
// and a direct `backendApi` caused environment drift: reads could work while
// writes timed out through Next.js. All browser → FastAPI traffic now goes
// through this client.
export const api = axios.create({
  baseURL: `${BACKEND_API}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000,
})

// Kept as a named export for any legacy callers still importing it.
export const backendApi = api

// ============= Types =============

export interface Company {
  id: string
  name: string
  ticker?: string
  created_at: string
}

export interface Document {
  id: string
  company_id?: string
  title: string
  year?: number
  source_url?: string
  mime: string
  sha256: string
  created_at: string
}

export interface CitationValidation {
  verified: boolean
  best_match?: string | null
  similarity?: number | null
  passage_index?: number | null
  method?: string | null
  reason?: string | null
}

export interface Citation {
  passage_id?: string | null
  page?: number | null
  snippet?: string | null
  document_id?: string | null
  validation?: CitationValidation | null
}

export interface Evidence {
  id?: string
  source_type?: string | null
  stance?: 'supports' | 'contradicts' | 'insufficient' | null
  strength?: number | null
  confidence?: number | null
  rationale?: string | null
  reasoning_steps?: string[] | null
  citations?: Citation[] | null
}

export interface Score {
  dimension: string
  value: number
  explanation?: string | null
}

export interface Claim {
  id: string
  claim_text: string
  claim_type?: 'target' | 'achievement' | 'commitment' | 'plan' | null
  topic?:
    | 'emissions_reduction'
    | 'net_zero'
    | 'renewable_energy'
    | 'waste_circularity'
    | 'water'
    | 'biodiversity'
    | 'supply_chain'
    | 'other'
    | null
  target_year?: number | null
  baseline_year?: number | null
  scope_covered?: string[] | null
  numeric_value?: number | null
  units?: string | null
  page?: number | null
  confidence?: number | null
  evidence: Evidence[]
  scores: Score[]
  overall_rating: 'red' | 'amber' | 'green'
}

export interface AnalysisResponse {
  document_id: string
  claims: Claim[]
  total_claims: number
}

export type DocumentSegmentType = 'page' | 'section' | 'extraction_batch'

export interface DocumentSegment {
  segment_id: string
  segment_type: DocumentSegmentType
  title: string
  page_start?: number | null
  page_end?: number | null
  pages: number[]
  char_count: number
  preview?: string | null
  text?: string | null
  segment_ids?: string[] | null
}

export interface DocumentSegmentsResponse {
  document_id: string
  total_pages: number
  pages: DocumentSegment[]
  sections: DocumentSegment[]
  extraction_batches: DocumentSegment[]
}

// ============= API functions =============

export const uploadDocument = async (
  file: File,
  metadata?: {
    title?: string
    company_id?: string
    year?: number
    source_url?: string
  }
) => {
  const formData = new FormData()
  formData.append('file', file)

  if (metadata?.title) formData.append('title', metadata.title)
  if (metadata?.company_id) formData.append('company_id', metadata.company_id)
  if (metadata?.year) formData.append('year', metadata.year.toString())
  if (metadata?.source_url) formData.append('source_url', metadata.source_url)

  const response = await api.post<Document>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000,
  })

  return response.data
}

export const analyzeDocument = async (documentId: string) => {
  const response = await api.post<AnalysisResponse>(
    `/documents/${documentId}/analyze`,
    {},
    { timeout: 300000 }
  )
  return response.data
}

export type AnalysisJobPhase =
  | 'idle'
  | 'queued'
  | 'starting'
  | 'loading_document'
  | 'extracting_claims'
  | 'analyzing_evidence'
  | 'finalizing'
  | 'completed'
  | 'failed'

export type AnalysisJobStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'

export interface AnalysisStatus {
  document_id: string
  claims_in_db: number
  status: AnalysisJobStatus
  phase: AnalysisJobPhase
  started_at?: string | null
  finished_at?: string | null
  updated_at?: string | null
  error?: string | null
  total_claims_estimate?: number | null
  claims_so_far?: number | null
  current_claim_index?: number | null
  current_claim_preview?: string | null
  last_claim_error?: string | null
  total_claims?: number | null
}

export interface AnalysisStartResponse {
  document_id: string
  status: AnalysisJobStatus
  message: string
  job?: AnalysisStatus
}

export const startAnalysis = async (
  documentId: string
): Promise<AnalysisStartResponse> => {
  const response = await api.post<AnalysisStartResponse>(
    `/documents/${documentId}/analyze-async`,
    {},
    { timeout: 15000 }
  )
  return response.data
}

export const getAnalysisStatus = async (
  documentId: string
): Promise<AnalysisStatus> => {
  const response = await api.get<AnalysisStatus>(
    `/documents/${documentId}/analysis-status`,
    { timeout: 15000 }
  )
  return response.data
}

export const getDocumentClaims = async (documentId: string) => {
  const response = await api.get<Claim[]>(`/documents/${documentId}/claims`)
  return response.data
}

export const listDocuments = async () => {
  const response = await api.get<Document[]>('/documents')
  return response.data
}

export const getDocument = async (documentId: string) => {
  const response = await api.get<Document>(`/documents/${documentId}`)
  return response.data
}

export const getDocumentSegments = async (
  documentId: string,
  includeText = false
) => {
  const response = await api.get<DocumentSegmentsResponse>(
    `/documents/${documentId}/segments`,
    { params: { include_text: includeText }, timeout: 180000 }
  )
  return response.data
}

export const createCompany = async (data: { name: string; ticker?: string }) => {
  const response = await api.post<Company>('/companies', data)
  return response.data
}

export const listCompanies = async () => {
  const response = await api.get<Company[]>('/companies')
  return response.data
}

export const deleteDocumentClaims = async (documentId: string) => {
  const response = await api.delete(`/documents/${documentId}/claims`)
  return response.data
}

export const reprocessDocument = async (documentId: string) => {
  const response = await api.post(
    `/documents/${documentId}/reprocess`,
    {},
    { timeout: 300000 }
  )
  return response.data
}

export const reanalyzeDocument = async (documentId: string) => {
  const response = await api.post<AnalysisResponse>(
    `/documents/${documentId}/reanalyze`,
    {},
    { timeout: 300000 }
  )
  return response.data
}

export const getDocumentFileUrl = (documentId: string, page?: number) => {
  const base = `${BACKEND_API}/api/documents/${documentId}/file`
  return typeof page === 'number' && page > 0 ? `${base}#page=${page}` : base
}

export const resetDatabase = async () => {
  const response = await api.post('/admin/reset')
  return response.data
}
