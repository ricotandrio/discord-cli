export const HttpMethod = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
} as const;

export const DomainArgs = {
  Auth: "auth",
  Channel: "channel",
  Message: "message",
  Thread: "thread",
  Search: "search",
} as const;
