from pathlib import Path

from evaluation import evaluate_cases, evaluate_file


def test_synthetic_evaluation_is_reproducible():
    fixture = (
        Path(__file__).parents[1]
        / "evaluation"
        / "synthetic_cases.json"
    )

    metrics = evaluate_file(fixture)

    assert metrics.cas == 14
    assert metrics.vrais_positifs == 11
    assert metrics.faux_positifs == 0
    assert metrics.faux_negatifs == 0
    assert metrics.precision == 1.0
    assert metrics.rappel == 1.0
    assert metrics.f1 == 1.0
    assert metrics.par_clause["Confidentialité"].vrais_positifs == 4
    assert metrics.par_clause["Non-concurrence"].vrais_positifs == 3
    assert metrics.par_clause["Gouvernance"].vrais_positifs == 4
    assert metrics.erreurs == []


def test_evaluation_reports_case_level_errors():
    metrics = evaluate_cases([
        {
            "id": "annotation-volontairement-incorrecte",
            "type": "page",
            "segments": [{
                "numero": 1,
                "texte": "Les parties acceptent une obligation de confidentialité.",
            }],
            "clauses_attendues": [],
        }
    ])

    assert metrics.faux_positifs == 1
    assert metrics.erreurs[0].cas == "annotation-volontairement-incorrecte"
    assert metrics.erreurs[0].clause == "Confidentialité"
    assert metrics.erreurs[0].type == "faux_positif"
