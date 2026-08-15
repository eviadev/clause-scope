import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileDiff,
  FileText,
  Loader2,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/Navbar'
import { comparisonService, demoService } from '@/lib/api'
import { isValidContractFile } from '@/lib/utils'
import type { ClauseChange, ClauseResult, ContractComparison } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!isValidContractFile(file)) return 'Formats acceptés : PDF ou DOCX.'
  if (file.size > MAX_FILE_SIZE) return 'Le fichier dépasse la limite de 10 Mo.'
  return null
}

function evidenceLabel(result?: ClauseResult): string | null {
  const evidence = result?.preuves?.[0]
  if (!evidence) return null
  const { localisation } = evidence
  return `${localisation.type === 'page' ? 'Page' : 'Section'} ${localisation.numero} · caractères ${localisation.debut}–${localisation.fin}`
}

function Evidence({ title, result }: { title: string; result?: ClauseResult }) {
  if (!result?.presente) return null
  const evidence = result.preuves?.[0]
  const excerpt = evidence?.contexte || result.extrait
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="text-xs font-medium">{Math.round(result.confiance * 100)} %</span>
      </div>
      {excerpt ? <p className="text-sm leading-relaxed">« {excerpt} »</p> : <p className="text-sm text-muted-foreground">Aucun extrait disponible.</p>}
      {evidenceLabel(result) && (
        <p className="mt-2 text-xs text-muted-foreground">{evidenceLabel(result)}</p>
      )}
    </div>
  )
}

function ChangeCard({ change }: { change: ClauseChange }) {
  const metadata = {
    ajoutee: { label: 'Ajoutée', icon: PlusCircle, className: 'text-green-700' },
    retiree: { label: 'Retirée', icon: MinusCircle, className: 'text-red-700' },
    modifiee: { label: 'Modifiée', icon: RefreshCw, className: 'text-amber-700' },
    inchangee: { label: 'Inchangée', icon: CheckCircle2, className: 'text-slate-600' },
  }[change.statut]
  const Icon = metadata.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{change.nom}</CardTitle>
          <span className={`flex items-center gap-1 text-sm font-semibold ${metadata.className}`}>
            <Icon className="h-4 w-4" /> {metadata.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Evidence title="Version précédente" result={change.avant} />
        <Evidence title="Nouvelle version" result={change.apres} />
      </CardContent>
    </Card>
  )
}

export function ContractComparePage() {
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [comparison, setComparison] = useState<ContractComparison | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  const visibleChanges = useMemo(
    () => comparison?.changements.filter((change) => change.statut !== 'inchangee') || [],
    [comparison]
  )

  const chooseFile = (file: File | undefined, target: 'before' | 'after') => {
    if (!file) return
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      if (target === 'before') setBeforeFile(null)
      else setAfterFile(null)
      return
    }
    setError(null)
    setComparison(null)
    if (target === 'before') setBeforeFile(file)
    else setAfterFile(file)
  }

  const compare = async () => {
    if (!beforeFile || !afterFile) return
    setIsLoading(true)
    setError(null)
    try {
      setComparison(await comparisonService.compare(beforeFile, afterFile))
    } catch {
      setError('La comparaison a échoué. Vérifiez les fichiers et réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDemo = async () => {
    setIsLoadingDemo(true)
    setError(null)
    setComparison(null)
    try {
      const files = await demoService.loadComparisonPair()
      setBeforeFile(files.before)
      setAfterFile(files.after)
    } catch {
      setError("Les contrats synthétiques n'ont pas pu être chargés.")
    } finally {
      setIsLoadingDemo(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <FileDiff className="h-5 w-5" /> Revue de versions
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Qu’est-ce qui a changé dans ce contrat ?</h1>
          <p className="mt-2 text-muted-foreground">
            Chargez une version précédente et une nouvelle version. ClauseScope classe les clauses ajoutées,
            retirées ou modifiées et relie chaque résultat à son extrait source.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Documents à comparer</CardTitle>
            <CardDescription>PDF ou DOCX, 10 Mo maximum par document.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="mb-5 w-full gap-2" onClick={() => void loadDemo()} disabled={isLoading || isLoadingDemo}>
              {isLoadingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isLoadingDemo ? 'Génération des contrats…' : 'Charger la démonstration synthétique'}
            </Button>
            <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <label className="rounded-xl border-2 border-dashed p-5 text-center transition-colors hover:border-primary/60">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <span className="block text-sm font-semibold">Version précédente</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{beforeFile?.name || 'Choisir un document'}</span>
                <Input className="mt-4" type="file" accept=".pdf,.docx" onChange={(event) => chooseFile(event.target.files?.[0], 'before')} disabled={isLoading || isLoadingDemo} />
              </label>
              <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-muted-foreground md:rotate-0" />
              <label className="rounded-xl border-2 border-dashed p-5 text-center transition-colors hover:border-primary/60">
                <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
                <span className="block text-sm font-semibold">Nouvelle version</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{afterFile?.name || 'Choisir un document'}</span>
                <Input className="mt-4" type="file" accept=".pdf,.docx" onChange={(event) => chooseFile(event.target.files?.[0], 'after')} disabled={isLoading || isLoadingDemo} />
              </label>
            </div>
            <Button className="mt-5 w-full gap-2" size="lg" onClick={compare} disabled={!beforeFile || !afterFile || isLoading || isLoadingDemo}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDiff className="h-5 w-5" />}
              {isLoading ? 'Comparaison en cours…' : 'Comparer les versions'}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Les fichiers temporaires sont supprimés après l’analyse.
            </p>
          </CardContent>
        </Card>

        {comparison && (
          <section className="mt-8" aria-live="polite">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Ajoutées', comparison.resume.ajoutees, 'text-green-700'],
                ['Retirées', comparison.resume.retirees, 'text-red-700'],
                ['Modifiées', comparison.resume.modifiees, 'text-amber-700'],
                ['Inchangées', comparison.resume.inchangees, 'text-slate-600'],
              ].map(([label, value, className]) => (
                <Card key={label as string}>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`mt-1 text-3xl font-bold ${className}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Changements à examiner</h2>
                <p className="text-sm text-muted-foreground">Les clauses inchangées restent comptabilisées, mais sont masquées pour accélérer la revue.</p>
              </div>
              <span className="text-sm font-semibold">{visibleChanges.length} changement{visibleChanges.length > 1 ? 's' : ''}</span>
            </div>
            {visibleChanges.length ? (
              <div className="space-y-4">{visibleChanges.map((change) => <ChangeCard key={`${change.nom}-${change.statut}`} change={change} />)}</div>
            ) : (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Aucun changement de clause détecté entre les deux versions.</AlertDescription>
              </Alert>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
