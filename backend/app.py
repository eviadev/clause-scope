"""API FastAPI de ClauseScope."""

from dataclasses import dataclass
import os
from pathlib import Path
import secrets
from typing import Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import Response
from sqlalchemy.orm import Session

from analysis import analyze_contract, compare_contracts
from config import get_settings
from crud import (
    create_deal,
    create_review_decision,
    get_all_deals,
    get_deal,
    get_review_decisions,
    save_contract_analysis,
)
from database import Base, SessionLocal, engine
from demo_contracts import build_demo_contract
from models import (
    ClauseResult,
    ContractComparison,
    DealCreate,
    DealResponse,
    LoginResponse,
    ReviewDecisionCreate,
    ReviewDecisionResponse,
)


Base.metadata.create_all(bind=engine)
settings = get_settings()
app = FastAPI(
    title="ClauseScope API",
    description=(
        "Analyse contractuelle fondée sur des preuves. "
        "Les résultats doivent être revus par un humain."
    ),
    version="0.4.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBasic(auto_error=False)


@dataclass(frozen=True)
class ValidatedUpload:
    original_filename: str
    extension: str
    content: bytes


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_credentials(
    credentials: HTTPBasicCredentials | None = Depends(security),
) -> str:
    if settings.auth_mode == "disabled":
        return "local-reviewer"
    if not settings.basic_auth_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'authentification est activée mais n'est pas configurée.",
        )
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
            headers={"WWW-Authenticate": "Basic"},
        )
    username_matches = secrets.compare_digest(
        credentials.username,
        settings.basic_username or "",
    )
    password_matches = secrets.compare_digest(
        credentials.password,
        settings.basic_password or "",
    )
    if not (username_matches and password_matches):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


async def validate_upload(file: UploadFile) -> ValidatedUpload:
    original_filename = Path(file.filename or "contract").name
    extension = Path(original_filename).suffix.lower()
    allowed_extensions = {".pdf", ".docx"}
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format non supporté. Formats acceptés : {', '.join(sorted(allowed_extensions))}",
        )

    content = await file.read(settings.max_upload_size_bytes + 1)
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Le fichier dépasse la taille maximale autorisée.",
        )
    return ValidatedUpload(original_filename, extension, content)


def write_temporary_upload(upload: ValidatedUpload) -> Path:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / f"{uuid4().hex}{upload.extension}"
    path.write_bytes(upload.content)
    return path


def remove_temporary_upload(path: Path | None) -> None:
    if path is not None and path.exists():
        os.remove(path)


@app.get("/")
def root():
    return {
        "message": "ClauseScope API",
        "version": "0.4.0",
        "docs": "/docs",
        "notice": "Les résultats doivent être revus par un humain.",
    }


@app.post("/auth/login", response_model=LoginResponse)
def login(credentials: HTTPBasicCredentials | None = Depends(security)):
    username = verify_credentials(credentials)
    return {"username": username, "message": "Authentification réussie"}


@app.get("/demo/contracts/{version}")
def get_demo_contract(
    version: Literal["before", "after"],
    username: str = Depends(verify_credentials),
):
    """Retourne un DOCX synthétique afin de tester la comparaison sans upload personnel."""

    filename = f"clausescope-demo-{version}.docx"
    return Response(
        content=build_demo_contract(version),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/deals", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_new_deal(
    deal: DealCreate,
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    return create_deal(db=db, deal=deal)


@app.get("/deals", response_model=list[DealResponse])
def list_deals(
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    return get_all_deals(db=db)


@app.get("/deals/{deal_id}", response_model=DealResponse)
def get_deal_by_id(
    deal_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    deal = get_deal(db=db, deal_id=deal_id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")
    return deal


@app.post("/deals/{deal_id}/contract", response_model=list[ClauseResult])
async def upload_and_analyze_contract(
    deal_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    deal = get_deal(db=db, deal_id=deal_id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")

    upload = await validate_upload(file)
    temporary_path = write_temporary_upload(upload)
    try:
        results = analyze_contract(str(temporary_path))
        save_contract_analysis(
            db=db,
            deal_id=deal_id,
            contract_filename=upload.original_filename,
            results=results,
        )
        return results
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="L'analyse du contrat a échoué.",
        ) from error
    finally:
        remove_temporary_upload(temporary_path)


@app.post("/contracts/compare", response_model=ContractComparison)
async def compare_contract_versions(
    before_file: UploadFile = File(...),
    after_file: UploadFile = File(...),
    username: str = Depends(verify_credentials),
):
    """Compare deux versions sans conserver les documents envoyés."""

    before_upload = await validate_upload(before_file)
    after_upload = await validate_upload(after_file)
    before_path: Path | None = None
    after_path: Path | None = None

    try:
        before_path = write_temporary_upload(before_upload)
        after_path = write_temporary_upload(after_upload)
        return compare_contracts(str(before_path), str(after_path))
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="La comparaison des contrats a échoué.",
        ) from error
    finally:
        remove_temporary_upload(before_path)
        remove_temporary_upload(after_path)


@app.get("/deals/{deal_id}/results", response_model=list[ClauseResult])
def get_analysis_results(
    deal_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    deal = get_deal(db=db, deal_id=deal_id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")
    if not deal.contract_analyzed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune analyse disponible pour ce dossier.",
        )
    return deal.analysis_results


@app.post(
    "/deals/{deal_id}/reviews",
    response_model=ReviewDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_review_decision(
    deal_id: int,
    review: ReviewDecisionCreate,
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    if not get_deal(db=db, deal_id=deal_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")
    return create_review_decision(
        db=db,
        deal_id=deal_id,
        reviewer=username,
        review=review,
    )


@app.get("/deals/{deal_id}/reviews", response_model=list[ReviewDecisionResponse])
def list_review_decisions(
    deal_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(verify_credentials),
):
    if not get_deal(db=db, deal_id=deal_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")
    return get_review_decisions(db=db, deal_id=deal_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
