---
name: review
description: 'Review a diff against its approved feature specification and plan. Use for read-only scope, acceptance, test, and security review.'
argument-hint: 'Feature name or pull request context'
user-invocable: true
---

# Review a Feature Change

Perform a read-only review of `$ARGUMENTS`.

- Read the diff, the Approved spec, and the plan.
- Report unmet acceptance criteria, scope creep, missing tests, and security issues.
- Include file and line references for every finding.
- Do not modify files.
