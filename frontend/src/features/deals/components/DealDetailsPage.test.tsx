import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DealDetailsPage } from './DealDetailsPage'
import * as dealsHook from '@/hooks/useDeals'
import * as authHook from '@/hooks/useAuth'
import type { Deal } from '@/types'

vi.mock('@/hooks/useDeals')
vi.mock('@/hooks/useAuth')
vi.mock('@/features/reviews/components/ReviewDecisionPanel', () => ({
  ReviewDecisionPanel: () => <div>Journal de revue</div>,
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => navigate,
  useParams: () => ({ id: '1' }),
}))

describe('DealDetailsPage', () => {
  const fetchDeal = vi.fn()
  const uploadContract = vi.fn()
  const deal: Deal = {
    id: 1,
    nom: 'Test Deal',
    parties: 'Company A, Company B',
    montant: 500000,
    secteur: 'Technology',
    created_at: '2025-10-22T15:38:05.371580',
    contract_analyzed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchDeal.mockResolvedValue(deal)
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { username: 'reviewer' }, credentials: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    })
    vi.mocked(dealsHook.useDeals).mockReturnValue({
      deals: [], currentDeal: deal, isLoading: false, error: null,
      fetchDeals: vi.fn(), fetchDeal, createDeal: vi.fn(), uploadContract,
    })
  })

  const renderPage = () => render(<BrowserRouter><DealDetailsPage /></BrowserRouter>)

  it('renders the dossier context and fetches it on mount', () => {
    renderPage()
    expect(screen.getByText('Test Deal')).toBeInTheDocument()
    expect(screen.getAllByText('Company A, Company B').length).toBeGreaterThan(0)
    expect(screen.getByText('500 000,00 €')).toBeInTheDocument()
    expect(fetchDeal).toHaveBeenCalledWith(1)
  })

  it('renders loading and missing dossier states', () => {
    vi.mocked(dealsHook.useDeals).mockReturnValue({
      deals: [], currentDeal: null, isLoading: true, error: null,
      fetchDeals: vi.fn(), fetchDeal, createDeal: vi.fn(), uploadContract,
    })
    const { unmount } = renderPage()
    expect(screen.getByRole('status', { name: /chargement du dossier/i })).toBeInTheDocument()
    unmount()

    vi.mocked(dealsHook.useDeals).mockReturnValue({
      deals: [], currentDeal: null, isLoading: false, error: 'Dossier introuvable',
      fetchDeals: vi.fn(), fetchDeal, createDeal: vi.fn(), uploadContract,
    })
    renderPage()
    expect(screen.getByText('Dossier introuvable')).toBeInTheDocument()
  })

  it('validates the same formats as the API', () => {
    renderPage()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'contract.doc', { type: 'application/msword' })] } })
    expect(screen.getByText(/format invalide/i)).toBeInTheDocument()
  })

  it('uploads a selected contract and refreshes the dossier', async () => {
    uploadContract.mockResolvedValue({ success: true, results: [] })
    renderPage()
    const file = new File(['contract'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } })
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /analyser le document/i }))
    await waitFor(() => expect(uploadContract).toHaveBeenCalledWith(1, file))
    await waitFor(() => expect(fetchDeal).toHaveBeenCalledTimes(2))
  })

  it('displays traceable evidence for detected clauses', () => {
    const reviewedDeal: Deal = {
      ...deal,
      contract_analyzed: true,
      analysis_results: [{
        nom: 'Confidentialité', presente: true, confiance: 0.95,
        extrait: 'Les parties protègent les informations confidentielles.',
        preuves: [{
          texte_detecte: 'informations confidentielles',
          contexte: 'Les parties protègent les informations confidentielles.',
          localisation: { type: 'page', numero: 2, debut: 120, fin: 149 },
        }],
      }],
    }
    vi.mocked(dealsHook.useDeals).mockReturnValue({
      deals: [], currentDeal: reviewedDeal, isLoading: false, error: null,
      fetchDeals: vi.fn(), fetchDeal, createDeal: vi.fn(), uploadContract,
    })
    renderPage()
    expect(screen.getByText('Clauses détectées')).toBeInTheDocument()
    expect(screen.getByText('Confidentialité')).toBeInTheDocument()
    expect(screen.getByText(/Page 2.*caractères 120–149/)).toBeInTheDocument()
    expect(screen.getByText('95 %')).toBeInTheDocument()
  })

  it('returns to the dossiers dashboard', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /retour aux dossiers/i }))
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })
})
