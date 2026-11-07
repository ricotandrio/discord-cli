# Implementation Plan: discord-core

Status: Complete
Spec: [spec.md](./spec.md)

## Problem and approach
Implement the approved Discord core capabilities across CLI interfaces through
one shared service layer. Search is represented by an explicit
unsupported result because the Discord bot API does not provide a general
message-search endpoint.

## Prerequisites
- The linked spec is Approved.
- The bot token is read from `~/mcp.json` using the documented loader shape.

## Phases

### Phase 1: Establish messaging foundations
- **TD-MSG-001 (FR-MSG-001..005, NFR-001..005):** Define the shared messaging
  service contract, typed message payload/result/error models, bot-token
  configuration boundary, safe default `allowed_mentions`, and Discord REST
  adapter boundary.
  - **TASK-MSG-001:** Establish the TypeScript project source and test locations.
  - **TASK-MSG-002:** Implement validated string ID and message-content inputs,
    safe mention defaults, and sanitized structured error mapping.
  - **TASK-MSG-003:** Implement channel-send service behavior.

### Phase 2: Add reply and thread-send operations
- **TD-MSG-002 (FR-MSG-002..004):** Reuse the shared send operation with explicit
  reply references and thread channel targets.
  - **TASK-MSG-004:** Implement reply-to-message behavior with explicit
    `channel_id` and `message_id`.
  - **TASK-MSG-005:** Implement send-to-thread behavior with explicit `thread_id`.
  - **TASK-MSG-006:** Implement reply-inside-thread behavior with explicit
    `thread_id` and `message_id`.

### Phase 3: Expose CLI interfaces
- **TD-MSG-003 (FR-MSG-001..005, NFR-001, NFR-003..004):** Add thin CLI wrappers
  over the shared service.
  - **TASK-MSG-007:** Add CLI message/thread send and reply commands.
  - **TASK-MSG-008:** Add CLI argument handling.
  - **TASK-MSG-009:** Enforce JSON envelopes and stdout/stderr separation.

### Phase 4: Verify messaging behavior
- **TD-MSG-004 (FR-MSG-001..005, NFR-006):** Validate messaging with mocked
  Discord interactions and no default live network calls.
  - **TASK-MSG-010:** Test channel send, message reply, thread send, and thread reply.
  - **TASK-MSG-011:** Test validation, safe mentions, and the content limit.
  - **TASK-MSG-012:** Run typecheck, tests, and CLI smoke checks.

### Phase 5: Implement reading, search behavior, and threads
- **TD-CORE-005 (FR-READ-001..004, FR-SEARCH-001..003, FR-THREAD-001..005):**
  Implement Discord REST-backed reads and thread operations, with explicit
  unsupported behavior for bot message search.
  - **TASK-CORE-013:** Add paginated channel/thread message reads and message lookup.
  - **TASK-CORE-014:** Add explicit unsupported search results.
  - **TASK-CORE-015:** Add active-thread listing, thread lookup, and thread creation.
  - **TASK-CORE-016:** Expose all operations through the CLI.
  - **TASK-CORE-017:** Add mocked tests for reads, search limitation, and threads.

## Verified Files and Symbols
| Task ID | Existing path or symbol | Evidence |
|---|---|---|
| TASK-MSG-001 | `package.json`, `tsconfig.json`, `src/` | Project source, scripts, and compiler configuration now exist. |
| TASK-MSG-002 | `src/service.ts`, `src/types.ts` | Shared service and typed messaging models implement validation, safe mentions, and errors. |
| TASK-MSG-003..006 | `src/service.ts` | Shared service implements channel send, message reply, thread send, and thread reply. |
| TASK-MSG-007 | `src/cli.ts` | CLI dispatches the four provisional messaging commands. |
| TASK-MSG-010..012 | `src/test/service.test.ts`, `package.json` | Focused tests and verified npm scripts exist. |
| TASK-CORE-013..017 | `src/service.ts`, `src/cli.ts`, `src/test/service.test.ts` | Shared REST service, CLI dispatch, and mocked tests implement the remaining core operations. |

## Requirement Traceability
| Requirement ID | Design task IDs | Implementation task IDs | Acceptance criteria |
|---|---|---|---|
| FR-MSG-001 | TD-MSG-001, TD-MSG-003 | TASK-MSG-002, TASK-MSG-003, TASK-MSG-007, TASK-MSG-008 | AC-001 |
| FR-MSG-002 | TD-MSG-002, TD-MSG-003 | TASK-MSG-004, TASK-MSG-007, TASK-MSG-008 | AC-001 |
| FR-MSG-003 | TD-MSG-002, TD-MSG-003 | TASK-MSG-005, TASK-MSG-007, TASK-MSG-008 | AC-001 |
| FR-MSG-004 | TD-MSG-002, TD-MSG-003 | TASK-MSG-006, TASK-MSG-007, TASK-MSG-008 | AC-001 |
| FR-MSG-005 | TD-MSG-001, TD-MSG-003, TD-MSG-004 | TASK-MSG-002, TASK-MSG-009, TASK-MSG-011, TASK-MSG-012 | AC-001, AC-007, AC-009 |
| NFR-001..006 | TD-MSG-001, TD-MSG-003, TD-MSG-004 | TASK-MSG-001..012 | AC-007, AC-009 |
| FR-READ-001..004 | TD-CORE-005 | TASK-CORE-013, TASK-CORE-016, TASK-CORE-017 | AC-002, AC-003 |
| FR-SEARCH-001..003 | TD-CORE-005 | TASK-CORE-014, TASK-CORE-016, TASK-CORE-017 | AC-004 |
| FR-THREAD-001..005 | TD-CORE-005 | TASK-CORE-015..017 | AC-005, AC-006 |

## Progress
| Task ID | Status | Notes |
|---|---|---|
| TASK-MSG-001 | [x] Complete | TypeScript project structure and scripts established. |
| TASK-MSG-002 | [x] Complete | String ID/content validation, safe mentions, and sanitized errors added. |
| TASK-MSG-003 | [x] Complete | Channel send added through the Discord REST adapter. |
| TASK-MSG-004 | [x] Complete | Message reply added with explicit message reference. |
| TASK-MSG-005 | [x] Complete | Thread send added. |
| TASK-MSG-006 | [x] Complete | Thread reply added with explicit message reference. |
| TASK-MSG-007 | [x] Complete | CLI commands added. |
| TASK-MSG-008 | [x] Complete | CLI argument handling added. |
| TASK-MSG-009 | [x] Complete | JSON envelopes and output stream rules implemented. |
| TASK-MSG-010 | [x] Complete | Focused mocked messaging tests added. |
| TASK-MSG-011 | [x] Complete | Validation, safe mentions, and 2,000-character limit covered. |
| TASK-MSG-012 | [x] Complete | Typecheck, tests, and smoke checks passed. |
| TASK-CORE-013 | [x] Complete | Added paginated channel/thread reads and message lookup. |
| TASK-CORE-014 | [x] Complete | Added explicit unsupported bot-search result. |
| TASK-CORE-015 | [x] Complete | Added active threads, thread info, and thread creation. |
| TASK-CORE-016 | [x] Complete | Added CLI exposure for all core operations. |
| TASK-CORE-017 | [x] Complete | Added mocked tests for reads, search, and thread creation. |

## Testing and Verification
- `npm run typecheck` passes.
- `npm test` passes three focused mocked messaging tests.
- `npm test` covers messaging, reads, unsupported search, and thread creation.
- CLI smoke checks pass.
- CLI missing-token smoke test returns the documented authentication error.
- No lint command is configured yet.
- Live Discord integration tests remain opt-in.

## Deviations
- Search is explicitly unsupported because the Discord bot API does not provide
  a general message-search endpoint; the CLI returns a structured
  `unsupported` result rather than fabricating matches.
