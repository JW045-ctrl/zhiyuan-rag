import type {
  DifyRetrieverResource,
  DifyStreamEvent,
  JsonRecord,
  ZhiyuanStreamEvent,
} from "./types";

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSseData(frame: string): unknown | undefined {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");

  if (!data || data === "[DONE]") {
    return undefined;
  }

  return JSON.parse(data) as unknown;
}

export async function* parseDifySse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<DifyStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullyRead = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.search(/\r?\n\r?\n/);

      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0];
        buffer = buffer.slice(boundary + (separator?.length ?? 2));

        const parsed = parseSseData(frame);
        if (isJsonRecord(parsed)) {
          yield parsed as DifyStreamEvent;
        }

        boundary = buffer.search(/\r?\n\r?\n/);
      }

      if (done) {
        fullyRead = true;
        const parsed = parseSseData(buffer);
        if (isJsonRecord(parsed)) {
          yield parsed as DifyStreamEvent;
        }
        return;
      }
    }
  } finally {
    if (!fullyRead) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

export function getRetrieverResources(
  event: DifyStreamEvent,
): DifyRetrieverResource[] {
  const resources = event.metadata?.retriever_resources;

  if (!Array.isArray(resources)) {
    return [];
  }

  // These are the exact objects returned by Dify. Do not synthesize citations
  // from the answer text or change their identifiers, score, or content.
  return resources.filter(isJsonRecord) as DifyRetrieverResource[];
}

export function encodeZhiyuanSse(event: ZhiyuanStreamEvent): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`,
  );
}
