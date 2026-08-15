"""Opérations CRUD utilisées par l'API ClauseScope."""

from sqlalchemy.orm import Session

from database import Deal, ReviewDecision
from models import ClauseResult, DealCreate, ReviewDecisionCreate


def create_deal(db: Session, deal: DealCreate):
    db_deal = Deal(
        nom=deal.nom,
        parties=deal.parties,
        montant=deal.montant,
        secteur=deal.secteur,
        contract_analyzed=False,
    )
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal


def get_deal(db: Session, deal_id: int):
    return db.query(Deal).filter(Deal.id == deal_id).first()


def get_all_deals(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Deal).offset(skip).limit(limit).all()


def save_contract_analysis(
    db: Session,
    deal_id: int,
    contract_filename: str,
    results: list[ClauseResult],
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if deal:
        deal.contract_filename = contract_filename
        deal.contract_analyzed = True
        deal.analysis_results = [result.model_dump() for result in results]
        db.commit()
        db.refresh(deal)
    return deal


def create_review_decision(
    db: Session,
    deal_id: int,
    reviewer: str,
    review: ReviewDecisionCreate,
):
    """Ajoute une décision immuable au journal de revue."""

    decision = ReviewDecision(
        deal_id=deal_id,
        reviewer=reviewer,
        decision=review.decision,
        comment=review.comment,
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


def get_review_decisions(db: Session, deal_id: int):
    """Retourne le journal de revue, de la décision la plus récente à la plus ancienne."""

    return (
        db.query(ReviewDecision)
        .filter(ReviewDecision.deal_id == deal_id)
        .order_by(ReviewDecision.created_at.desc(), ReviewDecision.id.desc())
        .all()
    )
