import assert from "node:assert/strict";
import test from "node:test";

import {
  getRetrieverResources,
  parseDifySse,
  parseSseData,
} from "./sse";

test("parseSseData parses a Dify data frame", () => {
  assert.deepEqual(
    parseSseData('data: {"event":"message","answer":"你好"}'),
    { event: "message", answer: "你好" },
  );
});

test("parseDifySse handles frames split across chunks", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"event":"mess'));
      controller.enqueue(
        encoder.encode(
          'age","answer":"A"}\r\n\r\ndata: {"event":"message_end","metadata":{}}\n\n',
        ),
      );
      controller.close();
    },
  });

  const events = [];
  for await (const event of parseDifySse(body)) {
    events.push(event);
  }

  assert.deepEqual(events, [
    { event: "message", answer: "A" },
    { event: "message_end", metadata: {} },
  ]);
});

test("retriever_resources are preserved exactly from message_end metadata", () => {
  const resource = {
    dataset_id: "dataset-1",
    document_id: "document-1",
    segment_id: "segment-1",
    document_name: "lecture-18.pdf",
    score: 0.92,
    content: "真实检索片段",
    extra_field_from_dify: "kept",
  };

  const result = getRetrieverResources({
    event: "message_end",
    metadata: { retriever_resources: [resource] },
  });

  assert.equal(result[0], resource);
  assert.deepEqual(result, [resource]);
});

