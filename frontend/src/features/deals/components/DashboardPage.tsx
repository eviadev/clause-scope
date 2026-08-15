import { useEffect } from 'react'
import { CheckCircle, Clock, FileDiff, Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/Navbar'
import { useDeals } from '@/hooks/useDeals'
import { formatCurrency, formatDate } from '@/lib/utils'

export function DashboardPage() {
  const { deals, isLoading, error, fetchDeals } = useDeals()

  useEffect(() => {
    void fetchDeals()
  }, [fetchDeals])

  const stats = {
    total: deals.length,
    analyzed: deals.filter((deal) => deal.contract_analyzed).length,
    pending: deals.filter((deal) => !deal.contract_analyzed).length,
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold text-primary">Espace de revue</p>
            <h1 className="text-3xl font-bold tracking-tight">Dossiers contractuels</h1>
            <p className="mt-2 text-muted-foreground">Analysez un contrat ou comparez deux versions avec leurs preuves sources.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/compare">
              <Button size="lg" variant="outline" className="gap-2">
                <FileDiff className="h-5 w-5" /> Comparer deux versions
              </Button>
            </Link>
            <Link to="/deals/new">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> Nouveau dossier
              </Button>
            </Link>
          </div>
        </div>

        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Dossiers', value: stats.total, icon: TrendingUp, color: 'text-primary' },
            { label: 'Analysés', value: stats.analyzed, icon: CheckCircle, color: 'text-green-600' },
            { label: 'À examiner', value: stats.pending, icon: Clock, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent><div className={`text-3xl font-bold ${color}`}>{value}</div></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revue en cours</CardTitle>
            <CardDescription>Ouvrez un dossier pour consulter les extraits et leur localisation.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Chargement des dossiers"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>
            ) : deals.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Aucun dossier</h2>
                <p className="mb-6 mt-1 text-muted-foreground">Créez un dossier ou commencez directement par une comparaison.</p>
                <Link to="/deals/new"><Button className="gap-2"><Plus className="h-4 w-4" /> Créer un dossier</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="block rounded-xl border p-5 transition hover:border-primary/50 hover:bg-muted/40">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <h2 className="text-lg font-semibold">{deal.nom}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{deal.parties} · {deal.secteur}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="font-semibold">{formatCurrency(deal.montant)}</span>
                        <span className="text-muted-foreground">{formatDate(deal.created_at || deal.date_creation || new Date().toISOString())}</span>
                        <span className={`rounded-full px-3 py-1 font-medium ${deal.contract_analyzed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {deal.contract_analyzed ? 'Analysé' : 'À examiner'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
