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

export type DiscordMessage = {
  id: string;
  channel_id: string;
  author: Record<string, unknown>;
  content: string;
  timestamp: string;
  attachments: Array<Record<string, unknown>>;
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
