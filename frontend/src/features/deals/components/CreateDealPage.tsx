import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Navbar } from '@/components/Navbar'
import { useDeals } from '@/hooks/useDeals'
import type { DealCreate } from '@/types'

/**
 * Modern Create Deal page with TypeScript and shadcn/ui
 * Form to create a new deal
 */
export function CreateDealPage() {
  const navigate = useNavigate()
  const { createDeal, isLoading } = useDeals()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<DealCreate>({
    nom: '',
    parties: '',
    montant: 0,
    secteur: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'montant' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.nom.trim()) {
      setError('Le nom du deal est requis')
      return
    }
    if (!formData.parties.trim()) {
      setError('Les parties sont requises')
      return
    }
    if (formData.montant <= 0) {
      setError('Le montant doit être supérieur à 0')
      return
    }
    if (!formData.secteur.trim()) {
      setError('Le secteur est requis')
      return
    }

    const result = await createDeal(formData)
    if (result.success && result.deal) {
      navigate(`/deals/${result.deal.id}`)
    } else {
      setError(result.error || 'Erreur lors de la création du deal')
    }
  }

  const handleCancel = () => {
    navigate('/dashboard')
  }

  return (
    <div>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Créer un nouveau deal</h1>
          <p className="text-muted-foreground mt-2">
            Remplissez les informations pour créer un nouveau deal
          </p>
        </div>

        {/* Form Card */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informations du Deal</CardTitle>
            <CardDescription>
              Tous les champs sont obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Nom du deal */}
              <div className="space-y-2">
                <label htmlFor="nom" className="text-sm font-medium">
                  Nom du Deal *
                </label>
                <Input
                  id="nom"
                  name="nom"
                  type="text"
                  placeholder="Ex: Acquisition Entreprise X"
                  value={formData.nom}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Parties */}
              <div className="space-y-2">
                <label htmlFor="parties" className="text-sm font-medium">
                  Parties Impliquées *
                </label>
                <Input
                  id="parties"
                  name="parties"
                  type="text"
                  placeholder="Ex: Entreprise A, Entreprise B"
                  value={formData.parties}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Montant */}
              <div className="space-y-2">
                <label htmlFor="montant" className="text-sm font-medium">
                  Montant (€) *
                </label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ex: 500000"
                  value={formData.montant || ''}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Secteur */}
              <div className="space-y-2">
                <label htmlFor="secteur" className="text-sm font-medium">
                  Secteur d'Activité *
                </label>
                <Input
                  id="secteur"
                  name="secteur"
                  type="text"
                  placeholder="Ex: Technologie, Immobilier, Finance..."
                  value={formData.secteur}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Créer le Deal
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
