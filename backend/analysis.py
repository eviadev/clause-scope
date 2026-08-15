"""Extraction et détection de clauses avec provenance vérifiable."""

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Literal

from models import (
    ClauseChange,
    ClauseEvidence,
    ClauseResult,
    ComparisonSummary,
    ContractComparison,
    SourceLocation,
)

try:
    from PyPDF2 import PdfReader

    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from docx import Document

    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


SegmentType = Literal["page", "section"]


@dataclass(frozen=True)
class TextSegment:
    """Segment de texte dont les offsets correspondent au texte assemblé."""

    type: SegmentType
    numero: int
    texte: str
    debut: int
    fin: int


CLAUSE_PATTERNS = {
    "Confidentialité": {
        "keywords": [
            r"confidentialit[ée]",
            r"secret[s]?\s+(professionnel|commercial|d['\']affaires)",
            r"information[s]?\s+confidentielle[s]?",
            r"divulgation",
            r"non[- ]divulgation",
            r"\bNDA\b",
            r"accord\s+de\s+confidentialit[ée]",
            r"obligation\s+de\s+confidentialit[ée]",
            r"donn[ée]es\s+confidentielles",
        ],
        "context_words": [
            "secret",
            "divulguer",
            "révéler",
            "protection",
            "confidentiel",
            "discrétion",
            "privé",
            "sensible",
        ],
    },
    "Non-concurrence": {
        "keywords": [
            r"non[- ]concurrence",
            r"clause\s+de\s+non[- ]concurrence",
            r"interdiction\s+de\s+concurrence",
            r"activit[ée]\s+concurrente",
            r"obligation\s+de\s+non[- ]concurrence",
            r"s['\']abstenir\s+de\s+toute\s+concurrence",
            r"concurrencer",
            r"entreprise\s+concurrente",
        ],
        "context_words": [
            "concurrent",
            "concurrence",
            "rival",
            "compétiteur",
            "marché",
            "interdiction",
            "abstenir",
            "restreindre",
        ],
    },
    "Gouvernance": {
        "keywords": [
            r"gouvernance",
            r"conseil\s+d['\']administration",
            r"conseil\s+de\s+surveillance",
            r"assembl[ée]e\s+g[ée]n[ée]rale",
            r"droit[s]?\s+de\s+vote",
            r"proc[èe]s[- ]verbal",
            r"quorum",
            r"majorit[ée]\s+(simple|qualifi[ée]e)",
            r"administrateur[s]?",
            r"directoire",
            r"pouvoir[s]?\s+de\s+(d[ée]cision|gestion)",
            r"organe[s]?\s+de\s+(direction|gestion)",
        ],
        "context_words": [
            "conseil",
            "vote",
            "décision",
            "assemblée",
            "direction",
            "gestion",
            "pouvoir",
            "administration",
            "organe",
        ],
    },
}


NEGATION_PREFIX = re.compile(
    r"(?:\baucun(?:e)?\b|\babsence\s+de\b|\bsans\b(?!\s+préjudice))[^.;:\n]{0,80}$",
    re.IGNORECASE,
)


def is_explicitly_negated(text: str, match_start: int) -> bool:
    """Écarte les mentions qui déclarent explicitement l'absence d'une clause."""

    prefix = text[max(0, match_start - 100):match_start]
    return bool(NEGATION_PREFIX.search(prefix))


def assemble_segments(
    segment_type: SegmentType,
    contents: list[tuple[int, str]],
) -> tuple[str, list[TextSegment]]:
    """Assemble les segments et calcule des offsets exacts et reproductibles."""

    parts: list[str] = []
    segments: list[TextSegment] = []
    cursor = 0

    for numero, raw_text in contents:
        text = (raw_text or "").strip()
        if not text:
            continue

        if parts:
            separator = "\n\n"
            parts.append(separator)
            cursor += len(separator)

        start = cursor
        parts.append(text)
        cursor += len(text)
        segments.append(
            TextSegment(
                type=segment_type,
                numero=numero,
                texte=text,
                debut=start,
                fin=cursor,
            )
        )

    return "".join(parts), segments


def extract_text_from_pdf(file_path: str) -> tuple[str, list[TextSegment]]:
    if not PDF_AVAILABLE:
        raise ImportError("PyPDF2 n'est pas installé")

    reader = PdfReader(file_path)
    pages = [
        (page_number, page.extract_text() or "")
        for page_number, page in enumerate(reader.pages, start=1)
    ]
    return assemble_segments("page", pages)


def extract_text_from_docx(file_path: str) -> tuple[str, list[TextSegment]]:
    if not DOCX_AVAILABLE:
        raise ImportError("python-docx n'est pas installé")

    document = Document(file_path)
    sections: list[tuple[int, str]] = []
    current_lines: list[str] = []
    section_number = 1

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        is_heading = paragraph.style.name.startswith("Heading")
        if is_heading and current_lines:
            sections.append((section_number, "\n".join(current_lines)))
            current_lines = []
            section_number += 1
        current_lines.append(text)

    if current_lines:
        sections.append((section_number, "\n".join(current_lines)))

    return assemble_segments("section", sections)


def extract_text_from_file(file_path: str) -> tuple[str, list[TextSegment]]:
    extension = Path(file_path).suffix.lower()
    if extension == ".pdf":
        return extract_text_from_pdf(file_path)
    if extension == ".docx":
        return extract_text_from_docx(file_path)
    raise ValueError(f"Format de fichier non supporté: {extension}")


def find_clause_with_regex(text: str, patterns: dict) -> list[dict]:
    """Retourne toutes les correspondances avec leurs offsets absolus."""

    matches: list[dict] = []
    for pattern in patterns["keywords"]:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            if is_explicitly_negated(text, match.start()):
                continue
            context_start = max(0, match.start() - 150)
            context_end = min(len(text), match.end() + 150)
            context = text[context_start:context_end].strip()
            context_score = sum(
                1
                for word in patterns["context_words"]
                if re.search(word, context, re.IGNORECASE)
            )
            confidence = min(0.5 + (context_score * 0.1), 0.95)
            matches.append(
                {
                    "texte_detecte": match.group(),
                    "contexte": context,
                    "debut": match.start(),
                    "fin": match.end(),
                    "confiance": confidence,
                }
            )
    return matches


def locate_segment(
    segments: list[TextSegment],
    position: int,
) -> TextSegment | None:
    """Localise un offset absolu dans une page ou une section."""

    return next(
        (segment for segment in segments if segment.debut <= position < segment.fin),
        None,
    )


def analyze_text(text: str, segments: list[TextSegment]) -> list[ClauseResult]:
    """Analyse du texte déjà extrait, isolée pour permettre des tests déterministes."""

    results: list[ClauseResult] = []
    for clause_name, patterns in CLAUSE_PATTERNS.items():
        matches = find_clause_with_regex(text, patterns)
        if not matches:
            results.append(
                ClauseResult(nom=clause_name, presente=False, confiance=0.0)
            )
            continue

        best_match = max(
            matches,
            key=lambda item: (item["confiance"], item["fin"] - item["debut"]),
        )
        segment = locate_segment(segments, best_match["debut"])
        evidence: list[ClauseEvidence] = []
        position = None

        if segment is not None:
            label = "Page" if segment.type == "page" else "Section"
            position = f"{label} {segment.numero}"
            evidence.append(
                ClauseEvidence(
                    texte_detecte=best_match["texte_detecte"],
                    contexte=best_match["contexte"],
                    localisation=SourceLocation(
                        type=segment.type,
                        numero=segment.numero,
                        debut=best_match["debut"],
                        fin=best_match["fin"],
                    ),
                )
            )

        results.append(
            ClauseResult(
                nom=clause_name,
                presente=True,
                position=position,
                extrait=best_match["contexte"],
                confiance=best_match["confiance"],
                preuves=evidence,
            )
        )

    return results


def analyze_contract(file_path: str) -> list[ClauseResult]:
    text, segments = extract_text_from_file(file_path)
    return analyze_text(text, segments)


def _normalized_excerpt(result: ClauseResult | None) -> str:
    if result is None or not result.presente:
        return ""
    value = result.extrait or ""
    return " ".join(value.lower().split())


def compare_clause_results(
    before: list[ClauseResult],
    after: list[ClauseResult],
) -> ContractComparison:
    """Compare deux analyses sans confondre score et changement contractuel."""

    before_by_name = {result.nom: result for result in before}
    after_by_name = {result.nom: result for result in after}
    ordered_names = list(CLAUSE_PATTERNS)
    ordered_names.extend(
        sorted((set(before_by_name) | set(after_by_name)) - set(ordered_names))
    )

    changes: list[ClauseChange] = []
    counters = {
        "ajoutee": 0,
        "retiree": 0,
        "modifiee": 0,
        "inchangee": 0,
    }

    for name in ordered_names:
        previous = before_by_name.get(name)
        current = after_by_name.get(name)
        was_present = bool(previous and previous.presente)
        is_present = bool(current and current.presente)

        if not was_present and is_present:
            status = "ajoutee"
        elif was_present and not is_present:
            status = "retiree"
        elif was_present and is_present and (
            _normalized_excerpt(previous) != _normalized_excerpt(current)
        ):
            status = "modifiee"
        else:
            status = "inchangee"

        counters[status] += 1
        changes.append(
            ClauseChange(
                nom=name,
                statut=status,
                avant=previous,
                apres=current,
            )
        )

    return ContractComparison(
        resume=ComparisonSummary(
            ajoutees=counters["ajoutee"],
            retirees=counters["retiree"],
            modifiees=counters["modifiee"],
            inchangees=counters["inchangee"],
        ),
        changements=changes,
    )


def compare_contracts(before_path: str, after_path: str) -> ContractComparison:
    """Analyse et compare deux fichiers PDF ou DOCX."""

    return compare_clause_results(
        analyze_contract(before_path),
        analyze_contract(after_path),
    )
