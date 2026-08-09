import type {
  DifyRetrieverResource,
  ZhiyuanStreamEvent,
} from "@/lib/dify/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRetrieverResource(value: unknown): value is DifyRetrieverResource {
  return (
    isRecord(value) &&
    typeof value.document_name === "string" &&
    typeof value.document_id === "string" &&
    typeof value.segment_id === "string" &&
    typeof value.score === "number" &&
    typeof value.content === "string"
  );
}

export function dedupeRetrieverResources(
  resources: DifyRetrieverResource[],
): DifyRetrieverResource[] {
  const uniqueResources = new Map<string, DifyRetrieverResource>();

  for (const resource of resources) {
    const key = `${resource.document_id}\u0000${resource.segment_id}`;
    if (!uniqueResources.has(key)) {
      uniqueResources.set(key, resource);
    }
  }

  return Array.from(uniqueResources.values());
}

export function parseZhiyuanSseFrame(
  frame: string,
): ZhiyuanStreamEvent | undefined {
  const lines = frame.split(/\r?\n/);
  const eventName = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const dataText = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");

  if (!eventName || !dataText) {
    return undefined;
  }

  const data = JSON.parse(dataText) as unknown;
  if (!isRecord(data)) {
    throw new Error("Invalid SSE event data");
  }

  if (eventName === "answer.delta" && typeof data.answer === "string") {
    return { event: "answer.delta", data: { answer: data.answer } };
  }

  if (eventName === "citations" && Array.isArray(data.retriever_resources)) {
    return {
      event: "citations",
      data: {
        retriever_resources: data.retriever_resources.filter(
          isRetrieverResource,
        ),
      },
    };
  }

  if (eventName === "done") {
    return {
      event: "done",
      data: {
        conversation_id:
          typeof data.conversation_id === "string"
            ? data.conversation_id
            : undefined,
        message_id:
          typeof data.message_id === "string" ? data.message_id : undefined,
      },
    };
  }

  if (
    eventName === "error" &&
    typeof data.code === "string" &&
    typeof data.message === "string"
  ) {
    return {
      event: "error",
      data: { code: data.code, message: data.message },
    };
  }

  return undefined;
}

export async function* parseZhiyuanSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ZhiyuanStreamEvent> {
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

        const event = parseZhiyuanSseFrame(frame);
        if (event) {
          yield event;
        }

        boundary = buffer.search(/\r?\n\r?\n/);
      }

      if (done) {
        fullyRead = true;
        const event = parseZhiyuanSseFrame(buffer);
        if (event) {
          yield event;
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

