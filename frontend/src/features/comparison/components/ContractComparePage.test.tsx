import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ContractComparePage } from './ContractComparePage'
import { comparisonService, demoService } from '@/lib/api'
import * as authHook from '@/hooks/useAuth'
import type { ContractComparison } from '@/types'

vi.mock('@/lib/api', () => ({
  comparisonService: { compare: vi.fn() },
  demoService: { loadComparisonPair: vi.fn() },
}))
vi.mock('@/hooks/useAuth')

const comparison: ContractComparison = {
  resume: { ajoutees: 0, retirees: 0, modifiees: 1, inchangees: 2 },
  changements: [{
    nom: 'Résiliation',
    statut: 'modifiee',
    avant: {
      nom: 'Résiliation', presente: true, confiance: 0.9,
      preuves: [{ texte_detecte: 'préavis de 60 jours', contexte: 'Le préavis est de 60 jours.', localisation: { type: 'page', numero: 3, debut: 210, fin: 232 } }],
    },
    apres: {
      nom: 'Résiliation', presente: true, confiance: 0.94,
      preuves: [{ texte_detecte: 'préavis de 30 jours', contexte: 'Le préavis est de 30 jours.', localisation: { type: 'page', numero: 3, debut: 210, fin: 232 } }],
    },
  }],
}

describe('ContractComparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { username: 'reviewer' }, credentials: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    })
  })

  const renderPage = () => render(<BrowserRouter><ContractComparePage /></BrowserRouter>)

  it('compares two contracts and displays traceable changes', async () => {
    vi.mocked(comparisonService.compare).mockResolvedValue(comparison)
    renderPage()
    const inputs = document.querySelectorAll('input[type="file"]')
    const before = new File(['before'], 'before.pdf', { type: 'application/pdf' })
    const after = new File(['after'], 'after.pdf', { type: 'application/pdf' })
    fireEvent.change(inputs[0], { target: { files: [before] } })
    fireEvent.change(inputs[1], { target: { files: [after] } })
    fireEvent.click(screen.getByRole('button', { name: /comparer les versions/i }))

    await waitFor(() => expect(comparisonService.compare).toHaveBeenCalledWith(before, after))
    expect(await screen.findByText('Changements à examiner')).toBeInTheDocument()
    expect(screen.getByText('Résiliation')).toBeInTheDocument()
    expect(screen.getByText(/Le préavis est de 30 jours/)).toBeInTheDocument()
    expect(screen.getAllByText(/Page 3.*caractères 210–232/)).toHaveLength(2)
  })

  it('rejects unsupported files before calling the API', () => {
    renderPage()
    const firstInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(firstInput, { target: { files: [new File(['x'], 'contract.doc', { type: 'application/msword' })] } })
    expect(screen.getByText(/formats acceptés : PDF ou DOCX/i)).toBeInTheDocument()
    expect(comparisonService.compare).not.toHaveBeenCalled()
  })

  it('loads a fully synthetic comparison pair without personal documents', async () => {
    const before = new File(['before'], 'clausescope-demo-before.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const after = new File(['after'], 'clausescope-demo-after.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    vi.mocked(demoService.loadComparisonPair).mockResolvedValue({ before, after })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /charger la démonstration synthétique/i }))

    await waitFor(() => expect(demoService.loadComparisonPair).toHaveBeenCalledOnce())
    expect(await screen.findByText('clausescope-demo-before.docx')).toBeInTheDocument()
    expect(screen.getByText('clausescope-demo-after.docx')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /comparer les versions/i })).toBeEnabled()
  })
})
