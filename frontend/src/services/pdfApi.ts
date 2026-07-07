import type { AdaptedStudyMaterialData } from '../components/AdaptedStudyMaterial'
import type { AdaptationHistoryItem } from './adaptationHistory'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface PDFDocument {
  id: number
  user_id: number
  filename: string
  original_text: string
  adapted_text: string
  page_count: number
  start_page?: number
  end_page?: number
  adaptation_json?: string
  created_at: string
}

export interface SaveAdaptationInput {
  filename: string
  startPage: number
  endPage: number
  material: AdaptedStudyMaterialData
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

export async function saveAdaptation(token: string, input: SaveAdaptationInput): Promise<PDFDocument> {
  const res = await fetch(`${API_BASE}/pdfs/save-adaptation`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: input.filename,
      start_page: input.startPage,
      end_page: input.endPage,
      adaptation: input.material,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao salvar adaptação' }))
    throw new Error(err.detail || 'Erro ao salvar adaptação')
  }
  return res.json()
}

export function docToHistoryItem(doc: PDFDocument): AdaptationHistoryItem {
  let material: AdaptedStudyMaterialData | null = null

  if (doc.adaptation_json) {
    try {
      const parsed = JSON.parse(doc.adaptation_json) as Partial<AdaptedStudyMaterialData>
      material = {
        title: parsed.title ?? doc.filename.replace(/\.pdf$/i, ''),
        sourceLabel: parsed.sourceLabel ?? `PDF: ${doc.filename}`,
        summary: parsed.summary ?? '',
        keyIdeas: parsed.keyIdeas ?? [],
        glossary: parsed.glossary ?? [],
        steps: parsed.steps ?? [],
        visualMap: parsed.visualMap ?? '',
        examples: parsed.examples ?? [],
        formulas: parsed.formulas ?? [],
        studyGuide: parsed.studyGuide ?? [],
        quiz: parsed.quiz ?? [],
        mode: parsed.mode ?? 'ai_real',
        notice: parsed.notice,
        rag: parsed.rag ?? { enabled: false, retriever: '', topK: 0, contexts: [] },
      }
    } catch {
      material = null
    }
  }

  if (!material) {
    material = {
      title: doc.filename.replace(/\.pdf$/i, ''),
      sourceLabel: `PDF: ${doc.filename}`,
      summary: 'Adaptação anterior. Adapte novamente para ver o material completo.',
      keyIdeas: [],
      glossary: [],
      steps: [],
      visualMap: '',
      examples: [],
      formulas: [],
      studyGuide: [],
      quiz: [],
      mode: 'fallback',
      rag: { enabled: false, retriever: '', topK: 0, contexts: [] },
    }
  }

  return {
    id: String(doc.id),
    fileName: doc.filename,
    title: material.title,
    startPage: doc.start_page ?? 1,
    endPage: doc.end_page ?? doc.page_count,
    pageCount: doc.page_count,
    createdAt: doc.created_at,
    material,
    saved: true,
  }
}
