# Development

This document covers running the repository from source. For installation and
the production `discord-cli` executable, see [README.md](README.md).

## Install dependencies

```sh
npm ci
```

## Build and validate

```sh
npm run typecheck
npm run build
npm test
```

Tests use mocked Discord interactions and do not make live network requests.

## Run from the repository

The development CLI is invoked through npm:

```sh
npm start -- message send \
  --channel-id CHANNEL_ID \
  --content "Hello"
```

The same pattern applies to all commands documented in the README:

```sh
npm start -- message get --channel-id CHANNEL_ID --message-id MESSAGE_ID
npm start -- channel messages --channel-id CHANNEL_ID --limit 20
npm start -- thread list-active --channel-id CHANNEL_ID
```

Run the local stdio server directly with:

```sh
npm start -- mcp
```

## Configuration

Development uses the same bot-token configuration as the installed executable:
`~/mcp.json`. Never put the token in source, shell history, command arguments,
logs, or test fixtures.
