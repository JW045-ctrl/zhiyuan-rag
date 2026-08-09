import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { DifyRetrieverResource } from "../src/lib/dify/types";
import {
  createMarkdownReport,
  parseRagTestDataset,
  runEvaluation,
  writeEvaluationOutputs,
  type RagTestCase,
} from "./rag-evaluation";

function makeCase(index: number): RagTestCase {
  const isAnswer = index < 20;
  return {
    id: isAnswer
      ? `calc-answer-${String(index + 1).padStart(3, "0")}`
      : `calc-refuse-${String(index - 19).padStart(3, "0")}`,
    enabled: index < 2,
    question: isAnswer ? "什么是泰勒展开？" : "课程资料没有的校历是什么？",
    expected_behavior: isAnswer ? "ANSWER" : "REFUSE",
    expected_documents: isAnswer ? ["lecture-22.pdf"] : [],
    reference_answer: isAnswer
      ? "利用各阶导数构造幂级数。"
      : "没有资料时明确拒答。",
    tags: [isAnswer ? "answer" : "refuse"],
  };
}

function makeDatasetValue(): unknown {
  return {
    version: "1.0",
    course: "大一微积分",
    description: "测试",
    cases: Array.from({ length: 30 }, (_, index) => makeCase(index)),
  };
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

test("validates the 30-case dataset and enabled-case requirements", () => {
  const dataset = parseRagTestDataset(makeDatasetValue());
  assert.equal(dataset.cases.length, 30);

  const invalid = makeDatasetValue() as {
    cases: Array<Record<string, unknown>>;
  };
  invalid.cases[0].expected_documents = [];
  assert.throws(
    () => parseRagTestDataset(invalid),
    /至少需要一个预期文档/,
  );
});

test("runs SSE cases, preserves citations, and calculates metrics", async () => {
  const datasetValue = makeDatasetValue() as {
    cases: Array<Record<string, unknown>>;
  };
  datasetValue.cases[1] = {
    ...datasetValue.cases[1],
    expected_behavior: "REFUSE",
    expected_documents: [],
    reference_answer: "没有资料时明确拒答。",
  };
  const dataset = parseRagTestDataset(datasetValue);
  const resource: DifyRetrieverResource = {
    dataset_id: "dataset-1",
    document_id: "document-1",
    segment_id: "segment-1",
    document_name: "lecture-22.pdf",
    score: 0.91,
    content: "Taylor Series and Maclaurin Series",
  };
  let requestCount = 0;
  const fakeFetch: typeof fetch = async () => {
    requestCount += 1;
    const body =
      requestCount === 1
        ? sse("answer.delta", { answer: "泰勒展开来自课程资料。" }) +
          sse("citations", { retriever_resources: [resource] }) +
          sse("done", { message_id: "message-1" })
        : sse("answer.delta", {
            answer: "现有资料不足，无法根据现有资料回答。",
          }) +
          sse("citations", { retriever_resources: [] }) +
          sse("done", { message_id: "message-2" });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  const run = await runEvaluation({
    baseUrl: "http://127.0.0.1:3000",
    dataset,
    datasetFile: "evaluation/rag-test-cases.json",
    timeoutMs: 5_000,
    fetchImpl: fakeFetch,
  });

  assert.equal(run.results.length, 2);
  assert.deepEqual(run.results[0].retriever_resources, [resource]);
  assert.deepEqual(run.results[0].document_ids, ["document-1"]);
  assert.deepEqual(run.results[0].segment_ids, ["segment-1"]);
  assert.deepEqual(run.results[0].scores, [0.91]);
  assert.equal(run.metrics.expected_document_hit_rate, 1);
  assert.equal(run.metrics.correct_refusal_rate, 1);
  assert.equal(run.metrics.citation_presence_rate, 1);
  assert.equal(run.metrics.error_cases, 0);

  const report = createMarkdownReport(run);
  assert.match(report, /人工复核/);
  assert.match(report, /document_id: `document-1`/);

  const outputDirectory = await mkdtemp(join(tmpdir(), "zhiyuan-rag-eval-"));
  try {
    const paths = await writeEvaluationOutputs(run, outputDirectory);
    const json = JSON.parse(await readFile(paths.jsonPath, "utf8")) as {
      results: unknown[];
    };
    const markdown = await readFile(paths.markdownPath, "utf8");
    assert.equal(json.results.length, 2);
    assert.match(markdown, /知源 RAG 人工评估报告/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
