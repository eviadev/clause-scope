from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app as app_module
from models import ComparisonSummary, ContractComparison


client = TestClient(app_module.app)


def use_isolated_database():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    app_module.Base.metadata.create_all(bind=test_engine)
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app_module.app.dependency_overrides[app_module.get_db] = override_get_db
    return test_engine


def test_compare_endpoint_returns_result_and_removes_temporary_files(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(app_module.settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(
        app_module,
        "compare_contracts",
        lambda before, after: ContractComparison(
            resume=ComparisonSummary(ajoutees=1),
            changements=[],
        ),
    )

    response = client.post(
        "/contracts/compare",
        files={
            "before_file": ("avant.pdf", b"synthetic-before", "application/pdf"),
            "after_file": ("apres.docx", b"synthetic-after", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        },
    )

    assert response.status_code == 200
    assert response.json()["resume"]["ajoutees"] == 1
    assert list(Path(tmp_path).iterdir()) == []


def test_compare_endpoint_rejects_unsupported_files_without_writing_them(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(app_module.settings, "upload_dir", str(tmp_path))

    response = client.post(
        "/contracts/compare",
        files={
            "before_file": ("avant.txt", b"not-supported", "text/plain"),
            "after_file": ("apres.pdf", b"synthetic", "application/pdf"),
        },
    )

    assert response.status_code == 400
    assert not tmp_path.exists() or list(Path(tmp_path).iterdir()) == []


def test_compare_endpoint_rejects_oversized_files(monkeypatch, tmp_path):
    monkeypatch.setattr(app_module.settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(app_module.settings, "max_upload_size_bytes", 4)

    response = client.post(
        "/contracts/compare",
        files={
            "before_file": ("avant.pdf", b"too-large", "application/pdf"),
            "after_file": ("apres.pdf", b"ok", "application/pdf"),
        },
    )

    assert response.status_code == 413
    assert not tmp_path.exists() or list(Path(tmp_path).iterdir()) == []


def test_synthetic_demo_documents_produce_an_explainable_diff(monkeypatch, tmp_path):
    monkeypatch.setattr(app_module.settings, "upload_dir", str(tmp_path))
    before = client.get("/demo/contracts/before")
    after = client.get("/demo/contracts/after")

    assert before.status_code == 200
    assert after.status_code == 200
    assert before.content.startswith(b"PK")
    assert "attachment" in before.headers["content-disposition"]

    comparison = client.post(
        "/contracts/compare",
        files={
            "before_file": (
                "before.docx",
                before.content,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
            "after_file": (
                "after.docx",
                after.content,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
        },
    )

    assert comparison.status_code == 200
    assert comparison.json()["resume"] == {
        "ajoutees": 1,
        "retirees": 1,
        "modifiees": 1,
        "inchangees": 0,
    }
    assert list(Path(tmp_path).iterdir()) == []


def test_review_decisions_are_recorded_as_an_audit_trail():
    test_engine = use_isolated_database()
    try:
        deal_response = client.post(
            "/deals",
            json={
                "nom": "Acquisition synthétique",
                "parties": "Alpha, Beta",
                "montant": 100000,
                "secteur": "Technologie",
            },
        )
        assert deal_response.status_code == 201
        deal = deal_response.json()

        approved = client.post(
            f"/deals/{deal['id']}/reviews",
            json={"decision": "approved", "comment": "Preuves vérifiées."},
        )
        changes = client.post(
            f"/deals/{deal['id']}/reviews",
            json={"decision": "changes_requested", "comment": "Vérifier la durée du préavis."},
        )
        history = client.get(f"/deals/{deal['id']}/reviews")

        assert approved.status_code == 201
        assert approved.json()["reviewer"] == "local-reviewer"
        assert changes.status_code == 201
        assert history.status_code == 200
        assert [item["decision"] for item in history.json()] == [
            "changes_requested",
            "approved",
        ]
    finally:
        app_module.app.dependency_overrides.clear()
        test_engine.dispose()


def test_changes_requested_requires_a_comment():
    response = client.post(
        "/deals/1/reviews",
        json={"decision": "changes_requested", "comment": "   "},
    )

    assert response.status_code == 422


def test_review_decision_rejects_unknown_deal():
    test_engine = use_isolated_database()
    try:
        response = client.post(
            "/deals/999/reviews",
            json={"decision": "approved"},
        )

        assert response.status_code == 404
    finally:
        app_module.app.dependency_overrides.clear()
        test_engine.dispose()
