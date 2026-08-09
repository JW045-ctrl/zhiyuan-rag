import { createDifyChatStream } from "@/lib/dify/client";
import {
  encodeZhiyuanSse,
  getRetrieverResources,
  parseDifySse,
} from "@/lib/dify/sse";
import type { ZhiyuanStreamEvent } from "@/lib/dify/types";

const MAX_QUERY_LENGTH = 4_000;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function isQueryBody(value: unknown): value is { query: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return jsonError("请求体必须是有效的 JSON", 400);
  }

  if (!isQueryBody(requestBody)) {
    return jsonError("缺少字符串类型的 query", 400);
  }

  const query = requestBody.query.trim();

  if (!query) {
    return jsonError("问题不能为空", 400);
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return jsonError(`问题不能超过 ${MAX_QUERY_LENGTH} 个字符`, 400);
  }

  const upstreamAbortController = new AbortController();
  const abortUpstream = () => upstreamAbortController.abort();
  request.signal.addEventListener("abort", abortUpstream, { once: true });

  let difyResponse: Response;

  try {
    difyResponse = await createDifyChatStream({
      query,
      signal: upstreamAbortController.signal,
    });
  } catch (error) {
    request.signal.removeEventListener("abort", abortUpstream);

    if (error instanceof Error && error.message.includes("not configured")) {
      return jsonError("Dify 服务端凭据尚未配置", 503);
    }

    return jsonError("暂时无法连接 Dify 服务", 502);
  }

  if (!difyResponse.ok || !difyResponse.body) {
    request.signal.removeEventListener("abort", abortUpstream);
    await difyResponse.body?.cancel();
    return jsonError(`Dify 请求失败（HTTP ${difyResponse.status}）`, 502);
  }

  let streamCancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ZhiyuanStreamEvent) => {
        if (!streamCancelled && !request.signal.aborted) {
          controller.enqueue(encodeZhiyuanSse(event));
        }
      };

      const pump = async () => {
        let receivedTerminalEvent = false;

        try {
          for await (const event of parseDifySse(difyResponse.body!)) {
            if (event.event === "message" && typeof event.answer === "string") {
              send({
                event: "answer.delta",
                data: { answer: event.answer },
              });
              continue;
            }

            if (event.event === "message_end") {
              receivedTerminalEvent = true;

              send({
                event: "citations",
                data: {
                  retriever_resources: getRetrieverResources(event),
                },
              });
              send({
                event: "done",
                data: {
                  conversation_id: event.conversation_id,
                  message_id: event.message_id,
                },
              });
              break;
            }

            if (event.event === "error") {
              receivedTerminalEvent = true;
              send({
                event: "error",
                data: {
                  code: "DIFY_STREAM_ERROR",
                  message: "Dify 返回了流式处理错误",
                },
              });
              break;
            }
          }

          if (!receivedTerminalEvent && !request.signal.aborted) {
            send({
              event: "error",
              data: {
                code: "DIFY_STREAM_INCOMPLETE",
                message: "Dify 响应未正常结束",
              },
            });
          }
        } catch {
          if (!streamCancelled && !request.signal.aborted) {
            send({
              event: "error",
              data: {
                code: "DIFY_STREAM_PARSE_ERROR",
                message: "解析 Dify 流式响应失败",
              },
            });
          }
        } finally {
          request.signal.removeEventListener("abort", abortUpstream);
          if (!streamCancelled) {
            controller.close();
          }
        }
      };

      void pump();
    },
    cancel() {
      streamCancelled = true;
      request.signal.removeEventListener("abort", abortUpstream);
      upstreamAbortController.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
