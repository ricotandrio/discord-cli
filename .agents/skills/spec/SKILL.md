---
name: spec
description: 'Draft a feature specification from verified repository context. Use when creating or revising a Draft feature spec.'
argument-hint: 'Feature name'
user-invocable: true
---

# Draft a Feature Specification

For the named feature `$ARGUMENTS`:

1. Inspect the repository and existing documentation before proposing behavior.
2. Ask at most five essential clarifying questions; do not guess.
3. Write `docs/specs/$ARGUMENTS/spec.md` using [the spec template](../../../docs/templates/spec.md).
4. Set the status to Draft. Include FR/NFR/AC/TD/TASK traceability and Open Questions.
5. Do not write application code or a plan.
