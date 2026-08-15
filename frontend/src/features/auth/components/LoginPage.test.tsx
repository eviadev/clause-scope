import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import * as authHook from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth')

describe('LoginPage', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      credentials: null,
      isAuthenticated: false,
      login: mockLogin,
      logout: vi.fn(),
    })
  })

  const renderPage = () => render(<BrowserRouter><LoginPage /></BrowserRouter>)

  it('renders the ClauseScope login without demo credentials', () => {
    renderPage()
    expect(screen.getByText('ClauseScope')).toBeInTheDocument()
    expect(screen.getByLabelText(/identifiant/i)).toBeRequired()
    expect(screen.getByLabelText(/mot de passe/i)).toBeRequired()
    expect(screen.queryByText('test-only-secret')).not.toBeInTheDocument()
  })

  it('submits credentials and reports authentication failures', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Identifiants incorrects' })
    renderPage()
    fireEvent.change(screen.getByLabelText(/identifiant/i), { target: { value: 'reviewer' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ username: 'reviewer', password: 'secret' }))
    expect(await screen.findByText('Identifiants incorrects')).toBeInTheDocument()
  })

  it('disables the form while credentials are being verified', async () => {
    mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)))
    renderPage()
    fireEvent.change(screen.getByLabelText(/identifiant/i), { target: { value: 'reviewer' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(screen.getByRole('button', { name: /vérification/i })).toBeDisabled()
    await waitFor(() => expect(mockLogin).toHaveBeenCalledOnce())
  })
})
