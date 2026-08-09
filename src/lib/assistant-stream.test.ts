import assert from "node:assert/strict";
import test from "node:test";

import type { DifyRetrieverResource } from "./dify/types";
import {
  dedupeRetrieverResources,
  parseZhiyuanSseFrame,
  parseZhiyuanSseStream,
} from "./assistant-stream";

const source: DifyRetrieverResource = {
  dataset_id: "dataset-1",
  document_id: "document-1",
  segment_id: "segment-1",
  document_name: "lecture-22.pdf",
  score: 0.83,
  content: "幂级数在收敛半径内绝对收敛。",
};

test("parseZhiyuanSseFrame parses answer deltas", () => {
  assert.deepEqual(
    parseZhiyuanSseFrame(
      'event: answer.delta\ndata: {"answer":"逐字输出"}',
    ),
    { event: "answer.delta", data: { answer: "逐字输出" } },
  );
});

test("parseZhiyuanSseStream handles chunk boundaries", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("event: answer.delta\ndata: {\"ans"));
      controller.enqueue(
        encoder.encode(
          'wer":"A"}\n\nevent: citations\ndata: {"retriever_resources":[]}\n\n',
        ),
      );
      controller.close();
    },
  });

  const events = [];
  for await (const event of parseZhiyuanSseStream(stream)) {
    events.push(event);
  }

  assert.deepEqual(events, [
    { event: "answer.delta", data: { answer: "A" } },
    { event: "citations", data: { retriever_resources: [] } },
  ]);
});

test("dedupeRetrieverResources keeps the first document and segment pair", () => {
  const duplicate = { ...source, score: 0.72 };
  const otherSegment = { ...source, segment_id: "segment-2" };

  const result = dedupeRetrieverResources([
    source,
    duplicate,
    otherSegment,
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0], source);
  assert.equal(result[1], otherSegment);
});

