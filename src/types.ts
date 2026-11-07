export type AllowedMentions = {
  parse: never[];
};

export type MessagePayload = {
  content: string;
  allowed_mentions: AllowedMentions;
  message_reference?: {
    message_id: string;
    channel_id: string;
  };
};

export type DiscordMessage = Record<string, unknown> & {
  id: string;
  channel_id: string;
  author: Record<string, unknown>;
  content: string;
  timestamp: string;
  attachments: Array<Record<string, unknown>>;
};

export type DiscordChannel = Record<string, unknown> & { id: string };

export type MessageQuery = {
  limit?: string;
  before?: string;
  after?: string;
  around?: string;
};

export type ThreadCreateOptions = {
  name: string;
  auto_archive_duration?: string;
  rate_limit_per_user?: string;
  invitable?: string;
};

export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type Result<T> =
  | { ok: true; data: T; next_cursor: string | null }
  | { ok: false; error: ApiError };
