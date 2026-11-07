---
name: implement
description: 'Implement exactly one named phase or task set from an approved plan. Use when executing scoped implementation work.'
argument-hint: 'Feature name and phase or TASK IDs'
user-invocable: true
---

# Implement a Planned Scope

Implement exactly the named phase or TASK IDs for `$ARGUMENTS`.

- Read the Approved spec and its plan first.
- Follow existing repository style and shared service boundaries.
- Update plan checkboxes and the progress table.
- Run the repository's verified lint, typecheck, and test commands.
- Report deviations instead of changing scope.
