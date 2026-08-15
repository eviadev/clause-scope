"""Modèles d'API de ClauseScope."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DealCreate(BaseModel):
    """Données nécessaires pour créer un dossier de revue."""

    nom: str = Field(..., min_length=1, max_length=200)
    parties: str = Field(..., min_length=1)
    montant: float = Field(..., gt=0)
    secteur: str = Field(..., min_length=1, max_length=100)


class SourceLocation(BaseModel):
    """Localisation stable d'une preuve dans le texte extrait."""

    type: Literal["page", "section"]
    numero: int = Field(..., ge=1)
    debut: int = Field(..., ge=0, description="Offset absolu inclusif")
    fin: int = Field(..., ge=0, description="Offset absolu exclusif")


class ClauseEvidence(BaseModel):
    """Extrait vérifiable qui justifie une détection."""

    texte_detecte: str
    contexte: str
    localisation: SourceLocation


class ClauseResult(BaseModel):
    """Résultat d'analyse d'une clause, avec provenance vérifiable."""

    nom: str
    presente: bool
    position: Optional[str] = None
    extrait: Optional[str] = None
    confiance: float = Field(default=0.0, ge=0, le=1)
    preuves: list[ClauseEvidence] = Field(default_factory=list)


class ComparisonSummary(BaseModel):
    ajoutees: int = Field(default=0, ge=0)
    retirees: int = Field(default=0, ge=0)
    modifiees: int = Field(default=0, ge=0)
    inchangees: int = Field(default=0, ge=0)


class ClauseChange(BaseModel):
    nom: str
    statut: Literal["ajoutee", "retiree", "modifiee", "inchangee"]
    avant: Optional[ClauseResult] = None
    apres: Optional[ClauseResult] = None


class ContractComparison(BaseModel):
    resume: ComparisonSummary
    changements: list[ClauseChange]


class ReviewDecisionCreate(BaseModel):
    """Décision humaine ajoutée au journal de revue d'un dossier."""

    decision: Literal["approved", "changes_requested"]
    comment: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def require_comment_for_requested_changes(self):
        cleaned_comment = (self.comment or "").strip()
        if self.decision == "changes_requested" and not cleaned_comment:
            raise ValueError("Un commentaire est requis pour demander des changements.")
        self.comment = cleaned_comment or None
        return self


class ReviewDecisionResponse(BaseModel):
    """Entrée immuable du journal de revue humaine."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    deal_id: int
    reviewer: str
    decision: Literal["approved", "changes_requested"]
    comment: Optional[str]
    created_at: datetime


class DealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    parties: str
    montant: float
    secteur: str
    contract_filename: Optional[str]
    contract_analyzed: bool
    analysis_results: Optional[list[ClauseResult]]
    created_at: datetime

class LoginResponse(BaseModel):
    username: str
    message: str
