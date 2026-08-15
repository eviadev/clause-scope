"""Configuration SQLite minimale utilisée par le POC."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import get_settings


settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.database_url
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False)
    parties = Column(String(500), nullable=False)
    montant = Column(Float, nullable=False)
    secteur = Column(String(100), nullable=False)
    contract_filename = Column(String(255), nullable=True)
    contract_analyzed = Column(Boolean, default=False)
    analysis_results = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ReviewDecision(Base):
    """Décision append-only d'un reviewer sur un dossier contractuel."""

    __tablename__ = "review_decisions"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    reviewer = Column(String(200), nullable=False)
    decision = Column(String(32), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
