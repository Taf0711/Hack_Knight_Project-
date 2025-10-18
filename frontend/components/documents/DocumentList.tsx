'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { FileText, Calendar, ChevronRight } from 'lucide-react'
import { listDocuments } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export function DocumentList() {
  const router = useRouter()
  
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-20" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Failed to load documents</p>
      </div>
    )
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No documents yet</p>
        <p className="text-sm">Upload your first PDF to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
          onClick={() => router.push(`/documents/${doc.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <FileText className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {doc.title}
                </h4>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(doc.created_at)}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

