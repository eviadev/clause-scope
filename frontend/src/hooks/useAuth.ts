import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/lib/api'
import type { Credentials } from '@/types'

export function useAuth() {
  const navigate = useNavigate()
  const { user, credentials, isAuthenticated, login, logout: logoutStore } = useAuthStore()

  const handleLogin = async (credentialsToVerify: Credentials) => {
    try {
      await authService.login(credentialsToVerify)
      login(credentialsToVerify)
      navigate('/dashboard')
      return { success: true }
    } catch {
      return {
        success: false,
        error: 'Connexion impossible. Vérifiez vos identifiants et la configuration du serveur.',
      }
    }
  }

  const handleLogout = () => {
    logoutStore()
    navigate('/login')
  }

  return {
    user,
    credentials,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
  }
}
