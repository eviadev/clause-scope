import { useCallback } from 'react'
import { dealService } from '@/lib/api'
import { useDealsStore } from '@/stores/deals.store'
import type { DealCreate } from '@/types'

export function useDeals() {
  const {
    deals,
    currentDeal,
    isLoading,
    error,
    setDeals,
    setCurrentDeal,
    addDeal,
    updateDeal,
    setLoading,
    setError,
  } = useDealsStore()

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setDeals(await dealService.getAll())
    } catch {
      setError('Erreur lors du chargement des dossiers')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setDeals])

  const fetchDeal = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await dealService.getById(id)
      setCurrentDeal(data)
      return data
    } catch {
      setError('Erreur lors du chargement du dossier')
      return null
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setCurrentDeal])

  const createDeal = useCallback(async (dealData: DealCreate) => {
    try {
      setLoading(true)
      setError(null)
      const deal = await dealService.create(dealData)
      addDeal(deal)
      return { success: true, deal }
    } catch {
      const message = 'Erreur lors de la création du dossier'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, addDeal])

  const uploadContract = useCallback(async (dealId: number, file: File) => {
    try {
      setLoading(true)
      setError(null)
      const results = await dealService.uploadContract(dealId, file)
      updateDeal(dealId, {
        contract_uploaded: true,
        contract_analyzed: true,
        analysis_results: results,
      })
      return { success: true, results }
    } catch {
      const message = "Erreur lors de l'analyse du contrat"
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, updateDeal])

  return {
    deals,
    currentDeal,
    isLoading,
    error,
    fetchDeals,
    fetchDeal,
    createDeal,
    uploadContract,
  }
}
