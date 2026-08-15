import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, MessageSquareWarning, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { reviewService } from '@/lib/api'
import type { ReviewDecision, ReviewDecisionType } from '@/types'

export function ReviewDecisionPanel({ dealId }: { dealId: number }) {
  const [reviews, setReviews] = useState<ReviewDecision[]>([])
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadReviews = async () => {
      setIsLoading(true)
      try {
        const history = await reviewService.getAll(dealId)
        if (active) setReviews(history)
      } catch {
        if (active) setError("Le journal de revue n'a pas pu être chargé.")
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void loadReviews()
    return () => { active = false }
  }, [dealId])

  const submitDecision = async (decision: ReviewDecisionType) => {
    const cleanedComment = comment.trim()
    if (decision === 'changes_requested' && !cleanedComment) {
      setError('Décrivez les changements demandés avant de valider cette décision.')
      return
    }
    setError(null)
    setSuccess(null)
    setIsSaving(true)
    try {
      const review = await reviewService.create(dealId, {
        decision,
        comment: cleanedComment || undefined,
      })
      setReviews((current) => [review, ...current])
      setComment('')
      setSuccess(decision === 'approved' ? 'Analyse validée et ajoutée au journal.' : 'Demande de changements ajoutée au journal.')
    } catch {
      setError("La décision n'a pas pu être enregistrée.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Décision du reviewer</CardTitle>
            <CardDescription className="mt-1">Validez l’analyse ou demandez une correction. Chaque décision reste dans le journal d’audit.</CardDescription>
          </div>
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert variant="success" className="mb-4"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

        <label htmlFor="review-comment" className="text-sm font-medium">Commentaire de revue</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Notez les vérifications effectuées ou les changements attendus…"
          className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button className="gap-2" onClick={() => void submitDecision('approved')} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Valider l’analyse
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void submitDecision('changes_requested')} disabled={isSaving || !comment.trim()}>
            <MessageSquareWarning className="h-4 w-4" /> Demander des changements
          </Button>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold">Journal de revue</h3>
          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du journal…</div>
          ) : reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucune décision enregistrée pour ce dossier.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`flex items-center gap-2 text-sm font-semibold ${review.decision === 'approved' ? 'text-green-700' : 'text-amber-700'}`}>
                      {review.decision === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <MessageSquareWarning className="h-4 w-4" />}
                      {review.decision === 'approved' ? 'Analyse validée' : 'Changements demandés'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {new Date(review.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Reviewer : {review.reviewer}</p>
                  {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
