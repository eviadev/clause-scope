from analysis import analyze_text, assemble_segments, compare_clause_results
from models import ClauseResult


def get_result(results, name):
    return next(result for result in results if result.nom == name)


def test_assemble_segments_keeps_exact_offsets():
    full_text, segments = assemble_segments(
        "page",
        [(1, "Introduction"), (2, "Clause sensible")],
    )

    assert len(segments) == 2
    assert full_text[segments[0].debut : segments[0].fin] == "Introduction"
    assert full_text[segments[1].debut : segments[1].fin] == "Clause sensible"


def test_detected_clause_contains_verifiable_page_provenance():
    full_text, segments = assemble_segments(
        "page",
        [
            (1, "Objet et définitions du contrat."),
            (
                2,
                "Chaque partie protège toute information confidentielle et "
                "s'interdit de la divulguer.",
            ),
        ],
    )

    result = get_result(analyze_text(full_text, segments), "Confidentialité")

    assert result.presente is True
    assert result.position == "Page 2"
    assert len(result.preuves) == 1
    proof = result.preuves[0]
    assert proof.localisation.type == "page"
    assert proof.localisation.numero == 2
    assert (
        full_text[proof.localisation.debut : proof.localisation.fin]
        == proof.texte_detecte
    )


def test_missing_clause_has_no_evidence():
    full_text, segments = assemble_segments(
        "section",
        [(1, "Le contrat décrit uniquement les modalités de paiement.")],
    )

    result = get_result(analyze_text(full_text, segments), "Non-concurrence")

    assert result.presente is False
    assert result.position is None
    assert result.preuves == []


def test_nda_acronym_does_not_match_inside_french_words():
    full_text, segments = assemble_segments(
        "page",
        [(1, "Pendant douze mois, le vendeur évite toute activité concurrente.")],
    )

    result = get_result(analyze_text(full_text, segments), "Confidentialité")

    assert result.presente is False


def test_explicit_absence_of_clause_is_not_reported_as_present():
    full_text, segments = assemble_segments(
        "page",
        [(1, "Le contrat ne comporte aucune clause de non-concurrence.")],
    )

    result = get_result(analyze_text(full_text, segments), "Non-concurrence")

    assert result.presente is False


def test_comparison_classifies_added_removed_modified_and_unchanged_clauses():
    before = [
        ClauseResult(
            nom="Confidentialité",
            presente=True,
            extrait="Les informations restent confidentielles.",
            confiance=0.8,
        ),
        ClauseResult(
            nom="Non-concurrence",
            presente=True,
            extrait="La restriction dure douze mois.",
            confiance=0.8,
        ),
        ClauseResult(nom="Gouvernance", presente=False),
        ClauseResult(
            nom="Paiement",
            presente=True,
            extrait="Paiement sous trente jours.",
            confiance=0.7,
        ),
    ]
    after = [
        ClauseResult(
            nom="Confidentialité",
            presente=True,
            extrait="Les informations restent confidentielles.",
            confiance=0.9,
        ),
        ClauseResult(nom="Non-concurrence", presente=False),
        ClauseResult(
            nom="Gouvernance",
            presente=True,
            extrait="Le conseil statue à la majorité simple.",
            confiance=0.8,
        ),
        ClauseResult(
            nom="Paiement",
            presente=True,
            extrait="Paiement sous quarante-cinq jours.",
            confiance=0.7,
        ),
    ]

    comparison = compare_clause_results(before, after)
    statuses = {change.nom: change.statut for change in comparison.changements}

    assert statuses == {
        "Confidentialité": "inchangee",
        "Non-concurrence": "retiree",
        "Gouvernance": "ajoutee",
        "Paiement": "modifiee",
    }
    assert comparison.resume.ajoutees == 1
    assert comparison.resume.retirees == 1
    assert comparison.resume.modifiees == 1
    assert comparison.resume.inchangees == 1
