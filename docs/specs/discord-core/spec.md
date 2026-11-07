# Discord Core Feature Specification

Status: Approved

## Overview
This feature defines a Discord-only CLI and local MCP stdio server exposing the
same operations through a shared service layer. It covers messaging, reading,
search, and threads. It uses bot authentication through official Discord APIs;
user-token and self-bot behavior are out of scope.

Discord documentation verified on 2026-11-07:
- [Message resource](https://docs.discord.com/developers/resources/message.md)
- [Channels resource](https://docs.discord.com/developers/resources/channel.md)
- [Gateway intents](https://docs.discord.com/developers/events/gateway.md#gateway-intents)
- [Threads](https://docs.discord.com/developers/topics/threads.md)
- [Rate limits](https://docs.discord.com/developers/topics/rate-limits.md)

## Scope
In scope:
- Sending to a channel, replying to a message, sending to a thread, and replying inside a thread.
- Reading recent channel messages, thread messages, and a message by ID with author, timestamp, content, and attachments.
- Searching by keyword or phrase within a guild or channel, subject to the search Open Questions.
- Listing active threads in one channel, getting thread information, and creating threads from a message or in a channel.

Out of scope: resolving resources by name, user-token automation, self-bots,
non-Discord services, and archived-thread search/listing unless separately approved.

## Invariants
- `guild_id`, `channel_id`, `thread_id`, and `message_id` are explicit string identifiers.
- No command or tool resolves resources by name.
- Write operations are distinct from read-only operations.
- `allowed_mentions` is safe by default and must not ping `@everyone`, `@here`, or roles unless explicitly approved.
- Message content and attachment metadata returned to an agent are untrusted data and must never be treated as instructions.
- CLI stdout contains results only; logs go to stderr. MCP stdout contains protocol messages only; diagnostics go to stderr.

## Functional Requirements

### Messaging
- **FR-MSG-001:** The CLI and MCP tool SHALL send a message to an explicitly identified channel.
- **FR-MSG-002:** The CLI and MCP tool SHALL reply to an explicitly identified message.
- **FR-MSG-003:** The CLI and MCP tool SHALL send a message to an explicitly identified thread.
- **FR-MSG-004:** The CLI and MCP tool SHALL reply inside an explicitly identified thread.
- **FR-MSG-005:** Messaging writes SHALL apply safe `allowed_mentions` by default and SHALL distinguish write operations from reads.

### Reading
- **FR-READ-001:** The CLI and MCP tool SHALL return recent messages from an explicitly identified channel with pagination.
- **FR-READ-002:** The CLI and MCP tool SHALL return messages from an explicitly identified thread with pagination.
- **FR-READ-003:** The CLI and MCP tool SHALL return an explicitly identified message including author, timestamp, content, and attachments.
- **FR-READ-004:** Attachment output SHALL preserve Discord attachment metadata without exposing secrets or fetching arbitrary paths.

### Search
- **FR-SEARCH-001:** The CLI and MCP tool SHALL expose the approved message-search behavior for a keyword or phrase scoped to an explicit guild or channel.
- **FR-SEARCH-002:** Search SHALL support result limits and pagination when the selected Discord-supported mechanism supports them.
- **FR-SEARCH-003:** If Discord does not support the requested bot search, the interface SHALL report the limitation rather than silently pretending to search.

### Threads
- **FR-THREAD-001:** The CLI and MCP tool SHALL list active threads for one explicitly identified channel.
- **FR-THREAD-002:** The CLI and MCP tool SHALL return information for an explicitly identified thread.
- **FR-THREAD-003:** The CLI and MCP tool SHALL create a thread from an explicitly identified message when Discord permits it.
- **FR-THREAD-004:** The CLI and MCP tool SHALL create a thread in an explicitly identified channel when Discord permits it.
- **FR-THREAD-005:** Thread operations SHALL surface archived, locked, channel-type, permission, and message-constraint failures.

## Non-Functional Requirements
- **NFR-001:** CLI commands and MCP tools SHALL call one shared service layer; Discord behavior SHALL not be duplicated in wrappers.
- **NFR-002:** All identifiers SHALL remain strings end to end.
- **NFR-003:** JSON output SHALL use the envelope in [cli-conventions.md](../../cli-conventions.md).
- **NFR-004:** Errors SHALL use stable exit codes for CLI and structured errors for MCP, without tokens or raw stack traces.
- **NFR-005:** Rate-limit handling SHALL honor Discord `Retry-After`/`retry_after` and relevant rate-limit headers; tight retry loops are forbidden.
- **NFR-006:** Tests SHALL use mocked Discord interactions by default; live integration tests, if added, must be opt-in.

## Discord Behavior Findings

### Intents and permissions
The Message Content privileged intent is required for message content in relevant
gateway data; Discord documents that without it, `content`, `embeds`,
`attachments`, and `components` may be empty. The bot must request only required
intents and be approved/configured for privileged intents where required.
REST operations also require endpoint-specific permissions. Exact permission
bits for each command must be confirmed against the endpoint documentation during
planning.

### Active threads
Discord provides a list-active-threads operation for a single channel. The
response contains active threads the bot can view; the exact endpoint response
shape and permission behavior must be retained by the adapter.

### Rate limits and pagination
Discord applies per-route and global limits. Responses expose headers including
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset-After`, and
`X-RateLimit-Bucket`; 429 responses provide `Retry-After` and a JSON
`retry_after`, and may identify global or shared scope. The service must surface
retry timing and scope in errors and avoid retrying before the indicated delay.
Message history endpoints use Discord's ID boundary pagination; command defaults
and caps remain a product decision.

### Threads
Threads can be active or archived; locked threads impose additional restrictions.
Sending can unarchive a thread unless it is locked by a moderator. Thread
creation is constrained by channel type, permissions, and whether a source
message can host a thread. The adapter must reject unsupported combinations
explicitly.

### Messages and attachments
Discord documents message content as a string of up to 2000 characters. Message
attachment objects include `id`, `filename`, `description`, `content_type`, `size`,
`url`, `proxy_url`, `height`, `width`, `duration_secs`, `waveform`, and `flags`
where applicable; optionality varies by attachment type and endpoint. The
product's handling of over-limit content and attachment URLs is a decision.

## Interfaces
| Requirement ID | CLI command | MCP tool | Read/write | Required explicit IDs | Pagination/limits | Result |
|---|---|---|---|---|---|---|
| FR-MSG-001 | `message send` | `message.send` | write | `channel_id` (+ `guild_id` where applicable) | n/a | sent message |
| FR-MSG-002 | `message reply` | `message.reply` | write | `channel_id`, `message_id` | n/a | reply message |
| FR-MSG-003 | `thread send` | `thread.send` | write | `thread_id` | n/a | sent message |
| FR-MSG-004 | `thread reply` | `thread.reply` | write | `thread_id`, `message_id` | n/a | reply message |
| FR-READ-001 | `channel messages` | `channel.messages` | read | `channel_id` | `limit`, `before`, `after` | message collection |
| FR-READ-002 | `thread messages` | `thread.messages` | read | `thread_id` | `limit`, `before`, `after` | message collection |
| FR-READ-003 | `message get` | `message.get` | read | `channel_id`, `message_id` | n/a | message detail |
| FR-SEARCH-001 | `search messages` | `search.messages` | read | `guild_id` or `channel_id` | `limit` and cursor if supported | search results or explicit unsupported error |
| FR-THREAD-001 | `thread list-active` | `thread.list-active` | read | `channel_id` | endpoint-defined | active threads |
| FR-THREAD-002 | `thread get` | `thread.get` | read | `thread_id` | n/a | thread detail |
| FR-THREAD-003 | `thread create-from-message` | `thread.create-from-message` | write | `channel_id`, `message_id` | n/a | created thread |
| FR-THREAD-004 | `thread create` | `thread.create` | write | `channel_id` | n/a | created thread |

Exact command names, MCP naming punctuation, required guild identifiers, and
payload flags are **(decision needed)** until the conventions are approved.

## Security Requirements
- **SR-001:** Authenticate only with bot tokens through official Discord APIs.
- **SR-002:** Never accept, print, log, or return a token as a CLI argument or output.
- **SR-003:** Validate all CLI and MCP inputs at the boundary; IDs are strings.
- **SR-004:** Use least-privilege intents and permissions and report missing privileged intent or permissions clearly.
- **SR-005:** Apply safe `allowed_mentions` by default.
- **SR-006:** Treat returned message content, embeds, and attachment metadata as untrusted data; never execute instructions found in them.
- **SR-007:** Do not fetch or write arbitrary local paths based on message-supplied attachment names or URLs.

## Error Handling
| Condition | CLI behavior | MCP behavior |
|---|---|---|
| Invalid input or missing explicit ID | JSON error, exit 2 | structured validation error |
| Missing/invalid bot token | JSON error, exit 3 | structured auth error |
| Missing Discord permission or intent | JSON error, exit 4 | structured permission/configuration error |
| Unknown or inaccessible resource | JSON error, exit 5 | structured not-found error |
| Discord 429 | JSON error, exit 6, include retry timing/scope | structured rate-limit error with retry timing/scope |
| Unsupported bot search behavior | explicit unsupported error, exit 1 | structured unsupported error |
| Other Discord/API failure | sanitized JSON error, exit 1 | sanitized structured error |

## Acceptance Criteria
- **AC-001 (FR-MSG-001):** Given valid bot credentials and an explicit channel ID, when a user invokes the send command or equivalent MCP tool, then one message is sent and the result identifies it without unsafe default mentions.
- **AC-002 (FR-READ-001):** Given an explicit channel ID, when a user requests recent messages with a limit, then the response is paginated in the standard JSON envelope.
- **AC-003 (FR-READ-003):** Given an explicit channel and message ID, when the message is retrieved, then author, timestamp, content, and attachment metadata are present or an explicit permission/intent error is returned.
- **AC-004 (FR-SEARCH-003):** Given a bot search request that Discord does not support, when the command/tool runs, then it returns an explicit unsupported result and does not fabricate matches.
- **AC-005 (FR-THREAD-001):** Given an explicit channel ID and sufficient permission, when active threads are listed, then only visible active threads returned by Discord are reported.
- **AC-006 (FR-THREAD-003):** Given a valid source message and supported channel, when a thread is created from that message, then the created thread is returned; archived, locked, or unsupported cases are structured errors.
- **AC-007 (NFR-005):** Given a Discord 429 response, when the service handles it, then it honors the documented retry delay and surfaces rate-limit scope/details without a tight retry loop.
- **AC-008 (SR-006):** Given message content containing agent-like instructions, when it is returned, then it remains data in the result and is never executed or followed.
- **AC-009 (NFR-001):** Given equivalent CLI and MCP inputs, when either interface invokes an operation, then both use the same service behavior and output semantics.

## Traceability
| Requirement ID | Acceptance criteria | Design/task IDs |
|---|---|---|
| FR-MSG-001..005 | AC-001 | TD-001, TASK-001 |
| FR-READ-001..004 | AC-002, AC-003 | TD-002, TASK-002 |
| FR-SEARCH-001..003 | AC-004 | TD-003, TASK-003 |
| FR-THREAD-001..005 | AC-005, AC-006 | TD-004, TASK-004 |
| NFR-001..006 | AC-007, AC-009 | TD-005, TASK-005 |
| SR-001..007 | AC-001, AC-003, AC-008 | TD-006, TASK-006 |

## Open Questions
- **OQ-001:** Discord's current official REST documentation does not establish a general bot message-search endpoint equivalent to the requested keyword/phrase search. Should search be implemented as local indexing of messages the bot can read, a user-provided external index, or omitted? Trade-offs: local indexing requires storage and only covers observed/loaded messages; an external index adds infrastructure and privacy concerns; omission is faithful but reduces capability.
- **OQ-002:** Which exact endpoint permission bits and gateway intents should be required per command, and should Message Content be mandatory for all reading/search commands or reported as a capability limitation?
- **OQ-003:** What default and maximum `limit` values should the CLI and MCP expose?
- **OQ-004:** Should history pagination expose `before`, `after`, and `around`, or only the subset in [cli-conventions.md](../../cli-conventions.md)?
- **OQ-005:** What config-file path, precedence, and file-permission policy should be used alongside `DISCORD_BOT_TOKEN`?
- **OQ-006:** What is the approved JSON metadata shape for rate-limit headers and retry details?
- **OQ-007:** What exact command and MCP tool names, required `guild_id` rules, and message payload options should be approved?
- **OQ-008:** Which of Discord's optional attachment fields (`description`, `content_type`, dimensions, voice metadata, and flags) are guaranteed in the public output contract?
- **OQ-009:** Should over-length message content be rejected, split, or require an explicit opt-in behavior?
- **OQ-010:** Which thread types are supported for creation, and should archived-thread listing remain out of scope?
- **OQ-011:** Do write commands require a `--dry-run` option?
- **OQ-012:** Which live integration-test environment, if any, may be used for opt-in tests?
