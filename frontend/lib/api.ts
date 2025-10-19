import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE}/api/proxy`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Direct backend client for large uploads (bypass Next.js proxy timeout)
export const backendApi = axios.create({
  baseURL: `${BACKEND_API}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes for large file uploads with embedding processing
})

// Types
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

export interface Claim {
  id: string
  claim_text: string
  claim_type?: string
  topic?: string
  target_year?: number
  baseline_year?: number
  scope_covered?: string[]
  numeric_value?: number
  units?: string
  page?: number
  evidence: Evidence[]
  scores: Score[]
  overall_rating: 'red' | 'amber' | 'green'
}

export interface Evidence {
  id: string
  source_type?: string
  stance?: string
  strength?: number
  rationale?: string
  citations?: any
}

export interface Score {
  dimension: string
  value: number
  explanation?: string
}

export interface AnalysisResponse {
  document_id: string
  claims: Claim[]
  total_claims: number
}

// API functions
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

  // Use direct backend API for uploads to avoid Next.js proxy timeout
  const response = await backendApi.post<Document>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes timeout for large files
  })
  
  return response.data
}

export const analyzeDocument = async (documentId: string) => {
  // Use direct backend API for analysis to avoid Next.js proxy timeout
  const response = await backendApi.post<AnalysisResponse>(
    `/documents/${documentId}/analyze`,
    {},
    {
      timeout: 300000, // 5 minutes timeout for AI analysis
    }
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

export const createCompany = async (data: { name: string; ticker?: string }) => {
  const response = await api.post<Company>('/companies', data)
  return response.data
}

export const listCompanies = async () => {
  const response = await api.get<Company[]>('/companies')
  return response.data
}

export const deleteDocumentClaims = async (documentId: string) => {
  const response = await backendApi.delete(`/documents/${documentId}/claims`)
  return response.data
}

export const reprocessDocument = async (documentId: string) => {
  const response = await backendApi.post(`/documents/${documentId}/reprocess`, {}, {
    timeout: 300000, // 5 minutes for reprocessing
  })
  return response.data
}

export const reanalyzeDocument = async (documentId: string) => {
  // Delete claims first, then reanalyze
  await deleteDocumentClaims(documentId)
  return analyzeDocument(documentId)
}

export const resetDatabase = async () => {
  const response = await backendApi.post('/admin/reset')
  return response.data
}
