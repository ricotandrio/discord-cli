# CLI and MCP Conventions

## Command structure
CLI commands use `discord-cli <domain> <action> [flags]`. The initial domains are
`message`, `thread`, `channel`, and `search`; adding domains is **(decision needed)**.
The equivalent MCP tool name mirrors the CLI command and invokes the same shared
service operation.

Write operations (send, reply, and create-thread actions) must be visibly distinct
from read-only operations. Whether a separate `--dry-run` mode is required is
**(decision needed)**.

## Identifiers and input
All Discord identifiers are strings and are passed explicitly:
`--guild-id`, `--channel-id`, `--thread-id`, and `--message-id`. Commands must not
resolve servers, channels, threads, or messages by name.
MCP inputs use the same field names and string types. Command-specific required
identifiers are defined by the approved feature spec.

## Pagination
Collection commands accept `--limit` and a documented cursor or boundary. The
initial boundary flags are `--before` and `--after`; whether both are exposed for
every collection is **(decision needed)**. MCP tools use equivalent `limit`,
`before`, `after`, or cursor fields. Defaults and maximums must be documented per
command after Discord endpoint behavior is confirmed.

## Output
JSON is the default format. `--format json|text` may select human-readable text,
but text output must not change the JSON contract. Successful JSON responses use:

```json
{ "ok": true, "data": {}, "next_cursor": null }
```

`next_cursor` is `null` when the collection has no continuation. Whether the
envelope includes metadata such as rate-limit headers is **(decision needed)**.
MCP tools return the equivalent structured data and errors rather than formatted
terminal text.

## Errors and exit codes
Errors use:

```json
{ "ok": false, "error": { "code": "...", "message": "...", "details": {} } }
```

Exit codes are stable: `0` success, `1` other/API failure, `2` usage/validation,
`3` authentication, `4` permission, `5` not found, and `6` rate limited. The exact
error-code vocabulary and whether transient API failures get a separate code are
**(decision needed)**. Rate-limit errors must surface retry information when
Discord supplies it; credentials and tokens must never appear in errors.

## Configuration and token handling
The current implementation reads the bot token from `~/mcp.json`, accepting
`DISCORD_BOT_TOKEN` at the top level or under a server entry's `env` object.
The token is never accepted as a CLI argument, never logged, and never returned
in CLI or MCP output. Whether environment-variable fallback should be supported
is **(decision needed)**.

## Streams and logging
CLI stdout carries results only. Logs, diagnostics, progress, and warnings go to
stderr. For the MCP stdio server, stdout is reserved for protocol messages and
diagnostics go to stderr.
