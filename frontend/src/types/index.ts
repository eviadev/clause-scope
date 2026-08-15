/**
 * Type definitions for the ClauseScope application.
 */

export interface Credentials {
  username: string
  password: string
}

export interface User {
  username: string
}

export interface SourceLocation {
  type: 'page' | 'section'
  numero: number
  debut: number
  fin: number
}

export interface ClauseEvidence {
  texte_detecte: string
  contexte: string
  localisation: SourceLocation
}

export interface ClauseResult {
  nom: string
  presente: boolean
  position?: string
  extrait?: string
  confiance: number
  preuves?: ClauseEvidence[]
}

export interface ComparisonSummary {
  ajoutees: number
  retirees: number
  modifiees: number
  inchangees: number
}

export type ClauseChangeStatus = 'ajoutee' | 'retiree' | 'modifiee' | 'inchangee'

export interface ClauseChange {
  nom: string
  statut: ClauseChangeStatus
  avant?: ClauseResult
  apres?: ClauseResult
}

export interface ContractComparison {
  resume: ComparisonSummary
  changements: ClauseChange[]
}

export type ReviewDecisionType = 'approved' | 'changes_requested'

export interface ReviewDecisionCreate {
  decision: ReviewDecisionType
  comment?: string
}

export interface ReviewDecision extends ReviewDecisionCreate {
  id: number
  deal_id: number
  reviewer: string
  created_at: string
}

export interface Deal {
  id: number
  nom: string
  parties: string
  montant: number
  secteur: string
  created_at?: string
  date_creation?: string
  contract_filename?: string
  contract_uploaded?: boolean
  contract_analyzed: boolean
  analysis_results?: ClauseResult[]
}

export interface DealCreate {
  nom: string
  parties: string
  montant: number
  secteur: string
}

export interface LoginResponse {
  username: string
  message: string
}

export interface ApiError {
  detail: string
  status?: number
}
