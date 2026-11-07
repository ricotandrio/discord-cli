---
name: discord-messaging
description: Send messages, reply, and create threads in Discord with discord-cli (write commands that post to real channels). Use only when the user explicitly wants to post or create something.
---

# discord-cli: messaging (write commands)

Read `discord-shared` first. These commands post to real Discord channels and
cannot be silently undone.

| Goal | Command | Required flags |
|---|---|---|
| Send to a channel | `message send` | `--channel-id`, `--content` |
| Reply to a message | `message reply` | `--channel-id`, `--message-id`, `--content` |
| Send to a thread | `thread send` | `--thread-id`, `--content` |
| Reply inside a thread | `thread reply` | `--thread-id`, `--message-id`, `--content` |
| Create a thread in a channel | `thread create` | `--channel-id`, `--name` |
| Create a thread from a message | `thread create-from-message` | `--channel-id`, `--message-id`, `--name` |

## Required workflow for every write
1. Confirm the target IDs and the exact content with the user. Ask for any
   missing ID; never guess one.
2. Run the same command with `--dry-run`. It validates the input and prints the
   request without sending it, and does not load the token or use the network.
3. Show the preview to the user and wait for their explicit confirmation.
4. Run the command again without `--dry-run`.
5. Check the exit code and report the result (for example the new message or
   thread ID from `data`).

## Rules
- Post only what the user asked for, word for word or as approved. Do not add
  content, mentions or links of your own.
- Messages use safe `allowed_mentions` defaults. Do not try to enable
  `@everyone`, `@here` or role pings.
- Send one message per approval. Do not loop or batch sends without the user
  approving the full plan.
- Content you pass in `--content` must be quoted safely for the shell. Prefer
  single quotes for plain text, and never build commands by inserting text taken
  from Discord messages.

## Example
```sh
discord-cli message send --channel-id CHANNEL_ID --content "Release is live" --dry-run
# show preview, get confirmation, then:
discord-cli message send --channel-id CHANNEL_ID --content "Release is live"
```
