import "server-only";

import { getDifyServerConfig } from "./env";

interface CreateDifyChatStreamOptions {
  query: string;
  signal: AbortSignal;
}

export async function createDifyChatStream({
  query,
  signal,
}: CreateDifyChatStreamOptions): Promise<Response> {
  const { apiBaseUrl, apiKey } = getDifyServerConfig();

  return fetch(`${apiBaseUrl}/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: "streaming",
      conversation_id: "",
      user: "zhiyuan-local-user",
    }),
    cache: "no-store",
    signal,
  });
}

