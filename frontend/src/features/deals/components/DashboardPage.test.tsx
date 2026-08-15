import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import * as dealsHook from '@/hooks/useDeals'
import * as authHook from '@/hooks/useAuth'
import type { Deal } from '@/types'

vi.mock('@/hooks/useDeals')
vi.mock('@/hooks/useAuth')

const mockDeals: Deal[] = [
  { id: 1, nom: 'Deal Test 1', parties: 'Partie A, Partie B', montant: 100000, secteur: 'Tech', date_creation: '2025-10-22T00:00:00Z', contract_analyzed: true },
  { id: 2, nom: 'Deal Test 2', parties: 'Partie C, Partie D', montant: 50000, secteur: 'Finance', date_creation: '2025-10-21T00:00:00Z', contract_analyzed: false },
]

describe('DashboardPage', () => {
  const fetchDeals = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { username: 'reviewer' }, credentials: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    })
  })

  const mockState = (overrides: Partial<ReturnType<typeof dealsHook.useDeals>> = {}) => {
    vi.mocked(dealsHook.useDeals).mockReturnValue({
      deals: [], currentDeal: null, isLoading: false, error: null, fetchDeals,
      fetchDeal: vi.fn(), createDeal: vi.fn(), uploadContract: vi.fn(), ...overrides,
    })
  }
  const renderPage = () => render(<BrowserRouter><DashboardPage /></BrowserRouter>)

  it('loads deals and exposes the comparison workspace', () => {
    mockState()
    renderPage()
    expect(fetchDeals).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: /comparer deux versions/i })).toHaveAttribute('href', '/compare')
  })

  it('displays loading and error states', () => {
    mockState({ isLoading: true, error: 'Erreur de chargement' })
    renderPage()
    expect(screen.getByRole('status', { name: /chargement des dossiers/i })).toBeInTheDocument()
    expect(screen.getByText('Erreur de chargement')).toBeInTheDocument()
  })

  it('summarizes and lists contract review dossiers', () => {
    mockState({ deals: mockDeals })
    renderPage()
    expect(screen.getAllByText('Dossiers').length).toBeGreaterThan(0)
    expect(screen.getByText('Analysés')).toBeInTheDocument()
    expect(screen.getAllByText('À examiner').length).toBeGreaterThan(0)
    expect(screen.getByText('Deal Test 1')).toBeInTheDocument()
    expect(screen.getByText('Deal Test 2')).toBeInTheDocument()
    expect(screen.getByText(/100\s?000.*€/)).toBeInTheDocument()
    expect(screen.getByText(/50\s?000.*€/)).toBeInTheDocument()
  })

  it('displays an actionable empty state', () => {
    mockState()
    renderPage()
    expect(screen.getByText('Aucun dossier')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /créer un dossier/i })).toHaveAttribute('href', '/deals/new')
  })
})
