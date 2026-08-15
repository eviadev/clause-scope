import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReviewDecisionPanel } from './ReviewDecisionPanel'
import { reviewService } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  reviewService: { getAll: vi.fn(), create: vi.fn() },
}))

describe('ReviewDecisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reviewService.getAll).mockResolvedValue([])
  })

  it('loads and displays the immutable review journal', async () => {
    vi.mocked(reviewService.getAll).mockResolvedValue([{
      id: 2, deal_id: 7, reviewer: 'alice', decision: 'changes_requested',
      comment: 'Vérifier le préavis.', created_at: '2026-08-15T08:00:00Z',
    }])
    render(<ReviewDecisionPanel dealId={7} />)

    expect(await screen.findByText('Changements demandés')).toBeInTheDocument()
    expect(screen.getByText('Reviewer : alice')).toBeInTheDocument()
    expect(screen.getByText('Vérifier le préavis.')).toBeInTheDocument()
  })

  it('records an approval and prepends it to the journal', async () => {
    vi.mocked(reviewService.create).mockResolvedValue({
      id: 3, deal_id: 7, reviewer: 'bob', decision: 'approved',
      comment: 'Toutes les preuves ont été vérifiées.', created_at: '2026-08-15T09:00:00Z',
    })
    render(<ReviewDecisionPanel dealId={7} />)
    await waitFor(() => expect(reviewService.getAll).toHaveBeenCalledWith(7))
    fireEvent.change(screen.getByLabelText(/commentaire de revue/i), { target: { value: 'Toutes les preuves ont été vérifiées.' } })
    fireEvent.click(screen.getByRole('button', { name: /valider l’analyse/i }))

    await waitFor(() => expect(reviewService.create).toHaveBeenCalledWith(7, {
      decision: 'approved', comment: 'Toutes les preuves ont été vérifiées.',
    }))
    expect(await screen.findByText('Analyse validée')).toBeInTheDocument()
  })

  it('requires an explanation before requesting changes', async () => {
    vi.mocked(reviewService.create).mockResolvedValue({
      id: 4, deal_id: 7, reviewer: 'bob', decision: 'changes_requested',
      comment: 'Le préavis est ambigu.', created_at: '2026-08-15T09:00:00Z',
    })
    render(<ReviewDecisionPanel dealId={7} />)
    const button = screen.getByRole('button', { name: /demander des changements/i })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/commentaire de revue/i), { target: { value: 'Le préavis est ambigu.' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(reviewService.create).toHaveBeenCalledWith(7, {
      decision: 'changes_requested', comment: 'Le préavis est ambigu.',
    }))
  })
})
