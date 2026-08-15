import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { CreateDealPage } from './CreateDealPage'
import * as useDealsHook from '@/hooks/useDeals'
import * as useAuthHook from '@/hooks/useAuth'

// Mock hooks
vi.mock('@/hooks/useDeals')
vi.mock('@/hooks/useAuth')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CreateDealPage', () => {
  const mockCreateDeal = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useDealsHook.useDeals).mockReturnValue({
      deals: [],
      currentDeal: null,
      isLoading: false,
      error: null,
      fetchDeals: vi.fn(),
      fetchDeal: vi.fn(),
      createDeal: mockCreateDeal,
      uploadContract: vi.fn(),
    })

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { username: 'reviewer' },
      credentials: { username: 'reviewer', password: 'test-only-secret' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
    })
  })

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <CreateDealPage />
      </BrowserRouter>
    )
  }

  it('should render create deal form', () => {
    renderComponent()
    
    expect(screen.getByText('Créer un nouveau deal')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nom du Deal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Parties Impliquées/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Montant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Secteur d'Activité/i)).toBeInTheDocument()
  })

  it('should show validation error when nom is empty', async () => {
    renderComponent()
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom du deal est requis')).toBeInTheDocument()
    })
  })

  it('should show validation error when parties is empty', async () => {
    renderComponent()
    
    const nomInput = screen.getByLabelText(/Nom du Deal/i)
    fireEvent.change(nomInput, { target: { value: 'Test Deal' } })
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Les parties sont requises')).toBeInTheDocument()
    })
  })

  it('should show validation error when montant is invalid', async () => {
    renderComponent()
    
    const nomInput = screen.getByLabelText(/Nom du Deal/i)
    fireEvent.change(nomInput, { target: { value: 'Test Deal' } })
    
    const partiesInput = screen.getByLabelText(/Parties Impliquées/i)
    fireEvent.change(partiesInput, { target: { value: 'Company A, Company B' } })
    
    const montantInput = screen.getByLabelText(/Montant/i)
    fireEvent.change(montantInput, { target: { value: '0' } })
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le montant doit être supérieur à 0')).toBeInTheDocument()
    })
  })

  it('should show validation error when secteur is empty', async () => {
    renderComponent()
    
    const nomInput = screen.getByLabelText(/Nom du Deal/i)
    fireEvent.change(nomInput, { target: { value: 'Test Deal' } })
    
    const partiesInput = screen.getByLabelText(/Parties Impliquées/i)
    fireEvent.change(partiesInput, { target: { value: 'Company A' } })
    
    const montantInput = screen.getByLabelText(/Montant/i)
    fireEvent.change(montantInput, { target: { value: '100000' } })
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le secteur est requis')).toBeInTheDocument()
    })
  })

  it('should create deal successfully and navigate to deal details', async () => {
    const mockDeal = {
      id: 1,
      nom: 'Test Deal',
      parties: 'Company A',
      montant: 100000,
      secteur: 'Tech',
      created_at: new Date().toISOString(),
      contract_uploaded: false,
      contract_analyzed: false,
    }

    mockCreateDeal.mockResolvedValue({
      success: true,
      deal: mockDeal,
    })

    renderComponent()
    
    fireEvent.change(screen.getByLabelText(/Nom du Deal/i), { 
      target: { value: 'Test Deal' } 
    })
    fireEvent.change(screen.getByLabelText(/Parties Impliquées/i), { 
      target: { value: 'Company A' } 
    })
    fireEvent.change(screen.getByLabelText(/Montant/i), { 
      target: { value: '100000' } 
    })
    fireEvent.change(screen.getByLabelText(/Secteur d'Activité/i), { 
      target: { value: 'Tech' } 
    })
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateDeal).toHaveBeenCalledWith({
        nom: 'Test Deal',
        parties: 'Company A',
        montant: 100000,
        secteur: 'Tech',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/deals/1')
    })
  })

  it('should show error message when creation fails', async () => {
    mockCreateDeal.mockResolvedValue({
      success: false,
      error: 'Erreur serveur',
    })

    renderComponent()
    
    fireEvent.change(screen.getByLabelText(/Nom du Deal/i), { 
      target: { value: 'Test Deal' } 
    })
    fireEvent.change(screen.getByLabelText(/Parties Impliquées/i), { 
      target: { value: 'Company A' } 
    })
    fireEvent.change(screen.getByLabelText(/Montant/i), { 
      target: { value: '100000' } 
    })
    fireEvent.change(screen.getByLabelText(/Secteur d'Activité/i), { 
      target: { value: 'Tech' } 
    })
    
    const submitButton = screen.getByRole('button', { name: /Créer le Deal/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Erreur serveur')).toBeInTheDocument()
    })
  })

  it('should navigate back to dashboard when cancel button is clicked', () => {
    renderComponent()
    
    const cancelButton = screen.getByRole('button', { name: /Annuler/i })
    fireEvent.click(cancelButton)
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('should disable form during submission', async () => {
    mockCreateDeal.mockImplementation(() => new Promise(() => {})) // Never resolves

    vi.mocked(useDealsHook.useDeals).mockReturnValue({
      deals: [],
      currentDeal: null,
      isLoading: true,
      error: null,
      fetchDeals: vi.fn(),
      fetchDeal: vi.fn(),
      createDeal: mockCreateDeal,
      uploadContract: vi.fn(),
    })

    renderComponent()
    
    expect(screen.getByLabelText(/Nom du Deal/i)).toBeDisabled()
    expect(screen.getByLabelText(/Parties Impliquées/i)).toBeDisabled()
    expect(screen.getByLabelText(/Montant/i)).toBeDisabled()
    expect(screen.getByLabelText(/Secteur d'Activité/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Création en cours/i })).toBeDisabled()
  })
})
