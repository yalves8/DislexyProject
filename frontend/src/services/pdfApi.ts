const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface PDFDocument {
  id: number
  user_id: number
  filename: string
  original_text: string
  adapted_text: string
  page_count: number
  created_at: string
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function uploadPDF(file: File, token: string): Promise<PDFDocument> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/pdfs/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao enviar PDF' }))
    throw new Error(err.detail || 'Erro ao enviar PDF')
  }
  return res.json()
}

export async function listPDFs(token: string): Promise<PDFDocument[]> {
  const res = await fetch(`${API_BASE}/pdfs`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Erro ao carregar biblioteca')
  return res.json()
}

export async function getPDF(id: number, token: string): Promise<PDFDocument> {
  const res = await fetch(`${API_BASE}/pdfs/${id}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('PDF não encontrado')
  return res.json()
}

export async function deletePDF(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pdfs/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Erro ao remover PDF')
}
