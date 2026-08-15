import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import type {
  ApiError,
  ClauseResult,
  ContractComparison,
  Credentials,
  Deal,
  DealCreate,
  LoginResponse,
  ReviewDecision,
  ReviewDecisionCreate,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const credentials = useAuthStore.getState().credentials
  if (credentials) {
    const token = btoa(`${credentials.username}:${credentials.password}`)
    config.headers.Authorization = `Basic ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.replace('/login')
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (credentials: Credentials): Promise<LoginResponse> => {
    const token = btoa(`${credentials.username}:${credentials.password}`)
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      {},
      { headers: { Authorization: `Basic ${token}` } }
    )
    return data
  },
}

export const dealService = {
  getAll: async (): Promise<Deal[]> => {
    const { data } = await apiClient.get<Deal[]>('/deals')
    return data
  },

  getById: async (id: number): Promise<Deal> => {
    const { data } = await apiClient.get<Deal>(`/deals/${id}`)
    return data
  },

  create: async (dealData: DealCreate): Promise<Deal> => {
    const { data } = await apiClient.post<Deal>('/deals', dealData)
    return data
  },

  uploadContract: async (dealId: number, file: File): Promise<ClauseResult[]> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ClauseResult[]>(
      `/deals/${dealId}/contract`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  getResults: async (dealId: number): Promise<ClauseResult[]> => {
    const { data } = await apiClient.get<ClauseResult[]>(`/deals/${dealId}/results`)
    return data
  },
}

export const comparisonService = {
  compare: async (beforeFile: File, afterFile: File): Promise<ContractComparison> => {
    const formData = new FormData()
    formData.append('before_file', beforeFile)
    formData.append('after_file', afterFile)
    const { data } = await apiClient.post<ContractComparison>(
      '/contracts/compare',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },
}

export const reviewService = {
  getAll: async (dealId: number): Promise<ReviewDecision[]> => {
    const { data } = await apiClient.get<ReviewDecision[]>(`/deals/${dealId}/reviews`)
    return data
  },

  create: async (dealId: number, review: ReviewDecisionCreate): Promise<ReviewDecision> => {
    const { data } = await apiClient.post<ReviewDecision>(`/deals/${dealId}/reviews`, review)
    return data
  },
}

export const demoService = {
  loadComparisonPair: async (): Promise<{ before: File; after: File }> => {
    const mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const [beforeResponse, afterResponse] = await Promise.all([
      apiClient.get<Blob>('/demo/contracts/before', { responseType: 'blob' }),
      apiClient.get<Blob>('/demo/contracts/after', { responseType: 'blob' }),
    ])
    return {
      before: new File([beforeResponse.data], 'clausescope-demo-before.docx', { type: mediaType }),
      after: new File([afterResponse.data], 'clausescope-demo-after.docx', { type: mediaType }),
    }
  },
}

export default apiClient
