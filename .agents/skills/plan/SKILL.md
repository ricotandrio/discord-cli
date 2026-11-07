---
name: plan
description: 'Create an implementation plan for an Approved feature specification. Use when planning an approved feature without writing code.'
argument-hint: 'Feature name'
user-invocable: true
---

# Create an Implementation Plan

For the named feature `$ARGUMENTS`:

1. Read `docs/specs/$ARGUMENTS/spec.md` and stop if its status is not Approved.
2. Inspect the codebase and verify every path and symbol before listing it.
3. Write `docs/specs/$ARGUMENTS/plan.md` using [the plan template](../../../docs/templates/plan.md).
4. Preserve requirement and acceptance-criteria traceability with TD and TASK IDs.
5. Do not write application code and do not list unverified paths.
