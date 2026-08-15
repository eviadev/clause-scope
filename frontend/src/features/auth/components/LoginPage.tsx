import { FormEvent, useState } from 'react'
import { FileText, Loader2, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    const result = await login({ username, password })
    if (!result.success) setError(result.error || 'Connexion impossible.')
    setIsLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto rounded-2xl bg-primary p-3">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">ClauseScope</CardTitle>
          <CardDescription>
            Analyse et comparaison contractuelles avec preuves traçables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Identifiant</label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Vérification…' : 'Se connecter'}
            </Button>
          </form>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Les identifiants restent uniquement en mémoire pendant la session.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
