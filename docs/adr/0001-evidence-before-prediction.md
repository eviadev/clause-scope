# ADR 0001: Evidence before prediction

- Status: accepted
- Date: 2026-08-15

## Context

A contract review tool can produce plausible labels while still being unsafe to trust. Reviewers need the exact text, location, uncertainty, and decision history behind every result.

## Decision

ClauseScope treats evidence as the stable product contract. Every detected clause carries an extract, a page or section, offsets, and confidence. Version comparisons retain the underlying evidence. Human review decisions are appended to an audit trail.

The current detector is an explicit heuristic baseline. Future NLP or LLM strategies must implement the same evidence contract and pass the same evaluation interface before they can replace it.

## Consequences

The system is inspectable without a model provider and can compare future strategies fairly. Synthetic benchmark scores remain regression signals only; they are not claims about real-world legal accuracy.
