import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle, FileText, Loader2, MapPin, Upload } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/Navbar'
import { useDeals } from '@/hooks/useDeals'
import { formatCurrency, formatDate, isValidContractFile } from '@/lib/utils'
import type { ClauseResult } from '@/types'
import { ReviewDecisionPanel } from '@/features/reviews/components/ReviewDecisionPanel'

function EvidenceBlock({ result }: { result: ClauseResult }) {
  const evidence = result.preuves?.[0]
  const excerpt = evidence?.contexte || result.extrait

  if (!result.presente) return null
  return (
    <div className="mt-3 rounded-lg bg-muted/50 p-4">
      {excerpt && <p className="text-sm leading-relaxed">« {excerpt} »</p>}
      {evidence && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {evidence.localisation.type === 'page' ? 'Page' : 'Section'} {evidence.localisation.numero}
          {' · '}caractères {evidence.localisation.debut}–{evidence.localisation.fin}
        </p>
      )}
    </div>
  )
}

export function DealDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentDeal, isLoading, error, fetchDeal, uploadContract } = useDeals()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (id) void fetchDeal(Number(id))
  }, [id, fetchDeal])

  const handleFileChange = (file?: File) => {
    if (!file) return
    if (!isValidContractFile(file)) {
      setUploadError('Format invalide. Utilisez un fichier PDF ou DOCX.')
      setSelectedFile(null)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Le fichier dépasse la limite de 10 Mo.')
      setSelectedFile(null)
      return
    }
    setUploadError(null)
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !id) return
    setIsUploading(true)
    setUploadError(null)
    const result = await uploadContract(Number(id), selectedFile)
    setIsUploading(false)
    if (result.success) {
      setSelectedFile(null)
      await fetchDeal(Number(id))
    } else {
      setUploadError(result.error || "L'analyse du contrat a échoué.")
    }
  }

  if (isLoading && !currentDeal) {
    return <div><Navbar /><div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Chargement du dossier"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div></div>
  }

  if (error || !currentDeal) {
    return (
      <div><Navbar /><main className="container mx-auto px-4 py-8">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error || 'Dossier introuvable.'}</AlertDescription></Alert>
        <Button onClick={() => navigate('/dashboard')} className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Retour aux dossiers</Button>
      </main></div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-5 gap-2"><ArrowLeft className="h-4 w-4" /> Retour aux dossiers</Button>
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{currentDeal.nom}</h1>
            <p className="mt-2 text-muted-foreground">{currentDeal.parties} · créé le {formatDate(currentDeal.created_at || currentDeal.date_creation || new Date().toISOString())}</p>
          </div>
          <span className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${currentDeal.contract_analyzed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {currentDeal.contract_analyzed ? 'Analyse disponible' : 'En attente de contrat'}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Contexte du dossier</CardTitle><CardDescription>Informations utilisées pendant la revue.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Parties</p><p className="font-semibold">{currentDeal.parties}</p></div>
              <div><p className="text-xs text-muted-foreground">Secteur</p><p className="font-semibold">{currentDeal.secteur}</p></div>
              <div><p className="text-xs text-muted-foreground">Montant</p><p className="font-semibold text-primary">{formatCurrency(currentDeal.montant)}</p></div>
              {currentDeal.contract_filename && <div><p className="text-xs text-muted-foreground">Document</p><p className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> {currentDeal.contract_filename}</p></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Analyser un contrat</CardTitle><CardDescription>PDF ou DOCX, 10 Mo maximum. Le fichier temporaire est supprimé après l’analyse.</CardDescription></CardHeader>
            <CardContent>
              {uploadError && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{uploadError}</AlertDescription></Alert>}
              <div className="rounded-xl border-2 border-dashed p-6 text-center">
                <Upload className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <Input type="file" accept=".pdf,.docx" onChange={(event) => handleFileChange(event.target.files?.[0])} disabled={isUploading} />
                {selectedFile && <p className="mt-3 truncate text-sm text-muted-foreground">{selectedFile.name}</p>}
              </div>
              <Button className="mt-4 w-full gap-2" size="lg" onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {isUploading ? 'Analyse en cours…' : 'Analyser le document'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {currentDeal.analysis_results && currentDeal.analysis_results.length > 0 && (
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Clauses détectées</h2>
              <p className="text-sm text-muted-foreground">Chaque détection présente est reliée à son extrait et à sa position exacte.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {currentDeal.analysis_results.map((result) => (
                <Card key={result.nom} className={result.presente ? 'border-green-200' : 'opacity-70'}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {result.presente ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                        <h3 className="font-semibold">{result.nom}</h3>
                      </div>
                      <span className="text-sm font-semibold">{Math.round(result.confiance * 100)} %</span>
                    </div>
                    <EvidenceBlock result={result} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {currentDeal.contract_analyzed && <ReviewDecisionPanel dealId={currentDeal.id} />}
      </main>
    </div>
  )
}
