"""Évaluation reproductible du détecteur sur des contrats synthétiques."""

from dataclasses import asdict, dataclass, field
import json
from pathlib import Path
import sys

from analysis import CLAUSE_PATTERNS, analyze_text, assemble_segments


MIN_PRECISION = 0.9
MIN_RECALL = 0.9


@dataclass(frozen=True)
class ClauseMetrics:
    vrais_positifs: int
    faux_positifs: int
    faux_negatifs: int
    precision: float
    rappel: float
    f1: float


@dataclass(frozen=True)
class EvaluationError:
    cas: str
    clause: str
    type: str


@dataclass(frozen=True)
class EvaluationMetrics:
    cas: int
    vrais_positifs: int
    faux_positifs: int
    faux_negatifs: int
    precision: float
    rappel: float
    f1: float
    par_clause: dict[str, ClauseMetrics] = field(default_factory=dict)
    erreurs: list[EvaluationError] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _safe_ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def _metrics(true_positives: int, false_positives: int, false_negatives: int) -> ClauseMetrics:
    precision = _safe_ratio(true_positives, true_positives + false_positives)
    recall = _safe_ratio(true_positives, true_positives + false_negatives)
    f1 = _safe_ratio(2 * precision * recall, precision + recall)
    return ClauseMetrics(
        vrais_positifs=true_positives,
        faux_positifs=false_positives,
        faux_negatifs=false_negatives,
        precision=round(precision, 4),
        rappel=round(recall, 4),
        f1=round(f1, 4),
    )


def evaluate_cases(cases: list[dict]) -> EvaluationMetrics:
    """Mesure précision, rappel et F1 sur des cas explicitement annotés."""

    true_positives = 0
    false_positives = 0
    false_negatives = 0
    clause_counts = {
        name: {"tp": 0, "fp": 0, "fn": 0}
        for name in CLAUSE_PATTERNS
    }
    errors: list[EvaluationError] = []

    for case in cases:
        segment_type = case.get("type", "page")
        contents = [
            (segment["numero"], segment["texte"])
            for segment in case["segments"]
        ]
        text, segments = assemble_segments(segment_type, contents)
        results = analyze_text(text, segments)
        predicted = {result.nom for result in results if result.presente}
        expected = set(case["clauses_attendues"])

        for clause_name in sorted(set(CLAUSE_PATTERNS) | predicted | expected):
            counts = clause_counts.setdefault(clause_name, {"tp": 0, "fp": 0, "fn": 0})
            if clause_name in predicted and clause_name in expected:
                counts["tp"] += 1
            elif clause_name in predicted:
                counts["fp"] += 1
                errors.append(EvaluationError(case["id"], clause_name, "faux_positif"))
            elif clause_name in expected:
                counts["fn"] += 1
                errors.append(EvaluationError(case["id"], clause_name, "faux_negatif"))

        true_positives += len(predicted & expected)
        false_positives += len(predicted - expected)
        false_negatives += len(expected - predicted)

    global_metrics = _metrics(true_positives, false_positives, false_negatives)

    return EvaluationMetrics(
        cas=len(cases),
        vrais_positifs=true_positives,
        faux_positifs=false_positives,
        faux_negatifs=false_negatives,
        precision=global_metrics.precision,
        rappel=global_metrics.rappel,
        f1=global_metrics.f1,
        par_clause={
            name: _metrics(counts["tp"], counts["fp"], counts["fn"])
            for name, counts in clause_counts.items()
        },
        erreurs=errors,
    )


def evaluate_file(path: str | Path) -> EvaluationMetrics:
    cases = json.loads(Path(path).read_text(encoding="utf-8"))
    return evaluate_cases(cases)


if __name__ == "__main__":
    default_fixture = Path(__file__).parent / "evaluation" / "synthetic_cases.json"
    metrics = evaluate_file(default_fixture)
    print(json.dumps(metrics.to_dict(), indent=2, ensure_ascii=False))
    if metrics.precision < MIN_PRECISION or metrics.rappel < MIN_RECALL:
        print(
            f"Quality gate failed: precision >= {MIN_PRECISION} and recall >= {MIN_RECALL} required.",
            file=sys.stderr,
        )
        raise SystemExit(1)
