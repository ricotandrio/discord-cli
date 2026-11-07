# Development

This document covers running the repository from source. For installation and
the production `discord-cli` executable, see [README.md](README.md).

## Install dependencies

```sh
npm ci
```

For a complete global setup from the repository, run:

```sh
npm run setup
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

## Configuration

Development uses the same credential store as the installed executable:
`~/discord-cli.json`. Run `npm start -- auth login` to store a token
interactively. Never put the token in source, shell history, command arguments,
logs, or test fixtures.
