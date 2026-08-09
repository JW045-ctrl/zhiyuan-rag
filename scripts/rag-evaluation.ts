import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseZhiyuanSseStream } from "../src/lib/assistant-stream";
import type { DifyRetrieverResource } from "../src/lib/dify/types";

export type ExpectedBehavior = "ANSWER" | "REFUSE";

export interface RagTestCase {
  id: string;
  enabled: boolean;
  question: string;
  expected_behavior: ExpectedBehavior;
  expected_documents: string[];
  reference_answer: string;
  tags: string[];
  expected_document_rationale: string;
  refusal_rationale: string;
  allowed_response_scope: string;
  fabrication_definition: string;
  todo_reason: string;
}

export interface RagTestDataset {
  $schema?: string;
  version: "1.0";
  course: string;
  description: string;
  cases: RagTestCase[];
}

export interface RagCaseError {
  code: string;
  message: string;
}

export interface RagCaseResult extends RagTestCase {
  started_at: string;
  response_time_ms: number;
  final_answer: string;
  retriever_resources: DifyRetrieverResource[];
  document_ids: string[];
  segment_ids: string[];
  scores: number[];
  error: RagCaseError | null;
  auto_checks: {
    expected_document_hit: boolean | null;
    matched_expected_documents: string[];
    refusal_detected: boolean;
    citation_exists: boolean;
  };
}

export interface RagEvaluationMetrics {
  attempted_cases: number;
  successful_cases: number;
  error_cases: number;
  request_success_rate: number | null;
  expected_document_hit_rate: number | null;
  expected_document_hits: number;
  expected_document_cases: number;
  correct_refusal_rate: number | null;
  correct_refusals: number;
  refusal_cases: number;
  citation_presence_rate: number | null;
  answer_cases_with_citations: number;
  answer_cases: number;
  average_response_time_ms: number | null;
  slowest_response_time_ms: number | null;
}

export interface RagEvaluationRun {
  run_id: string;
  generated_at: string;
  dataset_file: string;
  api_url: string;
  course: string;
  dataset_version: string;
  metrics: RagEvaluationMetrics;
  results: RagCaseResult[];
}

export interface RunEvaluationOptions {
  baseUrl: string;
  dataset: RagTestDataset;
  datasetFile: string;
  timeoutMs: number;
  caseIds?: string[];
  fetchImpl?: typeof fetch;
  onCaseStart?: (testCase: RagTestCase, index: number, total: number) => void;
}

export const REFUSAL_MARKERS = [
  "没有找到足够依据",
  "未找到足够依据",
  "没有足够的依据",
  "资料不足",
  "现有资料不足",
  "知识库中没有",
  "无法根据现有资料",
  "无法从现有资料",
  "无法从提供的资料",
  "超出知识库",
  "无法回答该问题",
  "不能可靠回答",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${path} 必须是字符串`);
  }
}

export function parseRagTestDataset(value: unknown): RagTestDataset {
  if (!isRecord(value)) {
    throw new Error("测试集根节点必须是对象");
  }

  assertString(value.version, "version");
  assertString(value.course, "course");
  assertString(value.description, "description");

  if (value.version !== "1.0") {
    throw new Error("当前仅支持测试集 version=1.0");
  }

  if (!value.course.trim()) {
    throw new Error("course 不能为空");
  }

  if (!Array.isArray(value.cases) || value.cases.length !== 30) {
    throw new Error("cases 必须恰好包含 30 道测试题");
  }

  const ids = new Set<string>();
  const cases = value.cases.map((rawCase, index): RagTestCase => {
    const path = `cases[${index}]`;
    if (!isRecord(rawCase)) {
      throw new Error(`${path} 必须是对象`);
    }

    assertString(rawCase.id, `${path}.id`);
    assertString(rawCase.question, `${path}.question`);
    assertString(rawCase.reference_answer, `${path}.reference_answer`);
    assertString(
      rawCase.expected_document_rationale,
      `${path}.expected_document_rationale`,
    );
    assertString(rawCase.refusal_rationale, `${path}.refusal_rationale`);
    assertString(rawCase.allowed_response_scope, `${path}.allowed_response_scope`);
    assertString(
      rawCase.fabrication_definition,
      `${path}.fabrication_definition`,
    );
    assertString(rawCase.todo_reason, `${path}.todo_reason`);

    if (!/^[a-z0-9][a-z0-9_-]*$/.test(rawCase.id)) {
      throw new Error(`${path}.id 只能包含小写字母、数字、下划线和连字符`);
    }

    if (ids.has(rawCase.id)) {
      throw new Error(`测试题 id 重复：${rawCase.id}`);
    }
    ids.add(rawCase.id);

    if (typeof rawCase.enabled !== "boolean") {
      throw new Error(`${path}.enabled 必须是布尔值`);
    }

    if (
      rawCase.expected_behavior !== "ANSWER" &&
      rawCase.expected_behavior !== "REFUSE"
    ) {
      throw new Error(`${path}.expected_behavior 必须是 ANSWER 或 REFUSE`);
    }

    if (!isStringArray(rawCase.expected_documents)) {
      throw new Error(`${path}.expected_documents 必须是字符串数组`);
    }

    if (!isStringArray(rawCase.tags)) {
      throw new Error(`${path}.tags 必须是字符串数组`);
    }

    const testCase: RagTestCase = {
      id: rawCase.id,
      enabled: rawCase.enabled,
      question: rawCase.question,
      expected_behavior: rawCase.expected_behavior,
      expected_documents: rawCase.expected_documents,
      reference_answer: rawCase.reference_answer,
      tags: rawCase.tags,
      expected_document_rationale: rawCase.expected_document_rationale,
      refusal_rationale: rawCase.refusal_rationale,
      allowed_response_scope: rawCase.allowed_response_scope,
      fabrication_definition: rawCase.fabrication_definition,
      todo_reason: rawCase.todo_reason,
    };

    if (testCase.enabled) {
      if (!testCase.question.trim()) {
        throw new Error(`${path}.question 在启用时不能为空`);
      }

      if (!testCase.reference_answer.trim()) {
        throw new Error(`${path}.reference_answer 在启用时不能为空`);
      }

      if (
        testCase.expected_behavior === "ANSWER" &&
        testCase.expected_documents.length === 0
      ) {
        throw new Error(
          `${path}.expected_documents：启用的 ANSWER 题至少需要一个预期文档`,
        );
      }

      if (
        testCase.expected_behavior === "ANSWER" &&
        !testCase.expected_document_rationale.trim()
      ) {
        throw new Error(
          `${path}.expected_document_rationale：启用的 ANSWER 题必须说明预期文档依据`,
        );
      }

      if (
        testCase.expected_behavior === "REFUSE" &&
        (!testCase.refusal_rationale.trim() ||
          !testCase.allowed_response_scope.trim() ||
          !testCase.fabrication_definition.trim())
      ) {
        throw new Error(
          `${path}：启用的 REFUSE 题必须填写拒答原因、允许范围和编造定义`,
        );
      }
    } else if (!testCase.todo_reason.trim()) {
      throw new Error(`${path}.todo_reason：未启用题必须说明 TODO 原因`);
    }

    return testCase;
  });

  return {
    ...(typeof value.$schema === "string" ? { $schema: value.$schema } : {}),
    version: "1.0",
    course: value.course,
    description: value.description,
    cases,
  };
}

function normalizeDocumentReference(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/").toLowerCase();
  return normalized.split("/").at(-1) ?? normalized;
}

export function matchExpectedDocuments(
  expectedDocuments: string[],
  resources: DifyRetrieverResource[],
): string[] {
  const actualReferences = new Set<string>();

  for (const resource of resources) {
    actualReferences.add(normalizeDocumentReference(resource.document_name));
    actualReferences.add(normalizeDocumentReference(resource.document_id));
  }

  return expectedDocuments.filter((expected) =>
    actualReferences.has(normalizeDocumentReference(expected)),
  );
}

export function detectRefusal(answer: string): boolean {
  const normalized = answer.replace(/\s+/g, "");
  return REFUSAL_MARKERS.some((marker) => normalized.includes(marker));
}

function calculateRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

export function calculateMetrics(results: RagCaseResult[]): RagEvaluationMetrics {
  const expectedDocumentResults = results.filter(
    (result) =>
      result.expected_behavior === "ANSWER" &&
      result.expected_documents.length > 0,
  );
  const expectedDocumentHits = expectedDocumentResults.filter(
    (result) => result.auto_checks.expected_document_hit === true,
  ).length;
  const refusalResults = results.filter(
    (result) => result.expected_behavior === "REFUSE",
  );
  const correctRefusals = refusalResults.filter(
    (result) => result.error === null && result.auto_checks.refusal_detected,
  ).length;
  const answerResults = results.filter(
    (result) => result.expected_behavior === "ANSWER",
  );
  const answerCasesWithCitations = answerResults.filter(
    (result) => result.error === null && result.auto_checks.citation_exists,
  ).length;
  const averageResponseTime =
    results.length === 0
      ? null
      : Number(
          (
            results.reduce(
              (total, result) => total + result.response_time_ms,
              0,
            ) / results.length
          ).toFixed(2),
        );
  const successfulCases = results.filter((result) => result.error === null).length;
  const slowestResponseTime =
    results.length === 0
      ? null
      : Math.max(...results.map((result) => result.response_time_ms));

  return {
    attempted_cases: results.length,
    successful_cases: successfulCases,
    error_cases: results.filter((result) => result.error !== null).length,
    request_success_rate: calculateRate(successfulCases, results.length),
    expected_document_hit_rate: calculateRate(
      expectedDocumentHits,
      expectedDocumentResults.length,
    ),
    expected_document_hits: expectedDocumentHits,
    expected_document_cases: expectedDocumentResults.length,
    correct_refusal_rate: calculateRate(correctRefusals, refusalResults.length),
    correct_refusals: correctRefusals,
    refusal_cases: refusalResults.length,
    citation_presence_rate: calculateRate(
      answerCasesWithCitations,
      answerResults.length,
    ),
    answer_cases_with_citations: answerCasesWithCitations,
    answer_cases: answerResults.length,
    average_response_time_ms: averageResponseTime,
    slowest_response_time_ms: slowestResponseTime,
  };
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "请求超时";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

async function runCase(
  testCase: RagTestCase,
  apiUrl: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<RagCaseResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let finalAnswer = "";
  let resources: DifyRetrieverResource[] = [];
  let error: RagCaseError | null = null;
  let receivedDone = false;

  try {
    const response = await fetchImpl(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: testCase.question }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = (await response.text()).slice(0, 500);
      error = {
        code: `HTTP_${response.status}`,
        message: message || `网站接口返回 HTTP ${response.status}`,
      };
    } else if (!response.body) {
      error = { code: "EMPTY_BODY", message: "网站接口没有返回 SSE 响应体" };
    } else {
      for await (const event of parseZhiyuanSseStream(response.body)) {
        if (event.event === "answer.delta") {
          finalAnswer += event.data.answer;
        } else if (event.event === "citations") {
          resources = event.data.retriever_resources;
        } else if (event.event === "error") {
          error = { code: event.data.code, message: event.data.message };
        } else if (event.event === "done") {
          receivedDone = true;
        }
      }

      if (!receivedDone && error === null) {
        error = {
          code: "STREAM_INCOMPLETE",
          message: "SSE 响应在 done 事件前结束",
        };
      }
    }
  } catch (caughtError) {
    error = {
      code:
        caughtError instanceof Error && caughtError.name === "AbortError"
          ? "TIMEOUT"
          : "REQUEST_ERROR",
      message: safeErrorMessage(caughtError),
    };
  } finally {
    clearTimeout(timeout);
  }

  const matchedExpectedDocuments = matchExpectedDocuments(
    testCase.expected_documents,
    resources,
  );
  const responseTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    ...testCase,
    started_at: startedAt,
    response_time_ms: responseTimeMs,
    final_answer: finalAnswer,
    retriever_resources: resources,
    document_ids: resources.map((resource) => resource.document_id),
    segment_ids: resources.map((resource) => resource.segment_id),
    scores: resources.map((resource) => resource.score),
    error,
    auto_checks: {
      expected_document_hit:
        testCase.expected_documents.length === 0
          ? null
          : matchedExpectedDocuments.length > 0,
      matched_expected_documents: matchedExpectedDocuments,
      refusal_detected: detectRefusal(finalAnswer),
      citation_exists: resources.length > 0,
    },
  };
}

export async function runEvaluation({
  baseUrl,
  dataset,
  datasetFile,
  timeoutMs,
  caseIds,
  fetchImpl = fetch,
  onCaseStart,
}: RunEvaluationOptions): Promise<RagEvaluationRun> {
  const parsedBaseUrl = new URL(baseUrl);
  const apiUrl = new URL("/api/chat", parsedBaseUrl).toString();
  const selectedIds = caseIds ? new Set(caseIds) : null;
  const runnableCases = dataset.cases.filter(
    (testCase) =>
      testCase.enabled && (selectedIds === null || selectedIds.has(testCase.id)),
  );

  if (selectedIds) {
    const enabledIds = new Set(runnableCases.map((testCase) => testCase.id));
    const missingIds = caseIds!.filter((id) => !enabledIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`以下题目不存在或尚未启用：${missingIds.join(", ")}`);
    }
  }

  if (runnableCases.length === 0) {
    throw new Error("没有已启用的测试题；请完成题目后将 enabled 设为 true");
  }

  const results: RagCaseResult[] = [];
  for (const [index, testCase] of runnableCases.entries()) {
    onCaseStart?.(testCase, index + 1, runnableCases.length);
    results.push(await runCase(testCase, apiUrl, timeoutMs, fetchImpl));
  }

  const generatedAt = new Date().toISOString();
  return {
    run_id: generatedAt.replace(/[:.]/g, "-"),
    generated_at: generatedAt,
    dataset_file: datasetFile,
    api_url: apiUrl,
    course: dataset.course,
    dataset_version: dataset.version,
    metrics: calculateMetrics(results),
    results,
  };
}

function formatRate(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(2)}%`;
}

function markdownText(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\r", "");
}

function quoteMarkdown(value: string): string {
  if (!value) {
    return "> （空）";
  }
  return value.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function truncate(value: string, length = 1_200): string {
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}

export function createMarkdownReport(run: RagEvaluationRun): string {
  const { metrics } = run;
  const lines = [
    "# 知源 RAG 人工评估报告",
    "",
    `- 运行时间：${run.generated_at}`,
    `- 课程：${run.course}`,
    `- 测试集：${markdownText(run.dataset_file)}`,
    `- 接口：${run.api_url}`,
    `- 已执行题数：${metrics.attempted_cases}`,
    "",
    "## 自动指标",
    "",
    "| 指标 | 结果 | 分子 / 分母 |",
    "| --- | ---: | ---: |",
    `| 请求成功率 | ${formatRate(metrics.request_success_rate)} | ${metrics.successful_cases} / ${metrics.attempted_cases} |`,
    `| 预期资料命中率 | ${formatRate(metrics.expected_document_hit_rate)} | ${metrics.expected_document_hits} / ${metrics.expected_document_cases} |`,
    `| 正确拒答率（规则检测） | ${formatRate(metrics.correct_refusal_rate)} | ${metrics.correct_refusals} / ${metrics.refusal_cases} |`,
    `| 引用存在率 | ${formatRate(metrics.citation_presence_rate)} | ${metrics.answer_cases_with_citations} / ${metrics.answer_cases} |`,
    `| 平均响应时间 | ${metrics.average_response_time_ms ?? "N/A"} ms | ${metrics.attempted_cases} 题 |`,
    `| 最慢响应时间 | ${metrics.slowest_response_time_ms ?? "N/A"} ms | 单题最大值 |`,
    `| 请求错误 | ${metrics.error_cases} | ${metrics.error_cases} / ${metrics.attempted_cases} |`,
    "",
    "> 正确拒答率只依据公开的拒答短语规则计算，不是 LLM 评分。答案忠实度、引用正确性和拒答合理性必须人工复核。",
    "",
    "## 逐题复核",
    "",
  ];

  for (const [index, result] of run.results.entries()) {
    const errorText = result.error
      ? `${result.error.code}: ${result.error.message}`
      : "无";
    lines.push(
      `### ${index + 1}. ${result.id}`,
      "",
      `- 问题：${markdownText(result.question)}`,
      `- 预期行为：${result.expected_behavior}`,
      `- 预期文档：${result.expected_documents.length > 0 ? result.expected_documents.map(markdownText).join(", ") : "无"}`,
      `- 预期文档依据：${markdownText(result.expected_document_rationale || "不适用")}`,
      `- 拒答原因：${markdownText(result.refusal_rationale || "不适用")}`,
      `- 允许回答范围：${markdownText(result.allowed_response_scope || "不适用")}`,
      `- 何种表现属于编造：${markdownText(result.fabrication_definition || "不适用")}`,
      `- 自动命中：${result.auto_checks.expected_document_hit === null ? "N/A" : result.auto_checks.expected_document_hit ? "是" : "否"}`,
      `- 检测到拒答：${result.auto_checks.refusal_detected ? "是" : "否"}`,
      `- 引用数量：${result.retriever_resources.length}`,
      `- 响应时间：${result.response_time_ms} ms`,
      `- 错误：${markdownText(errorText)}`,
      `- 标签：${result.tags.map(markdownText).join(", ") || "无"}`,
      "",
      "人工复核：",
      "",
      "- [ ] 检索命中正确",
      "- [ ] 引用与答案对应",
      "- [ ] 回答忠实于资料",
      "- [ ] 回答覆盖参考要点或拒答合理",
      "- 人工备注：",
      "",
      "#### 最终答案",
      "",
      quoteMarkdown(result.final_answer),
      "",
      "#### 参考答案",
      "",
      quoteMarkdown(result.reference_answer),
      "",
      "#### 真实引用",
      "",
    );

    if (result.retriever_resources.length === 0) {
      lines.push("（无）", "");
    } else {
      result.retriever_resources.forEach((resource, resourceIndex) => {
        lines.push(
          `${resourceIndex + 1}. **${markdownText(resource.document_name)}** — score: ${resource.score}`,
          `   - document_id: \`${resource.document_id}\``,
          `   - segment_id: \`${resource.segment_id}\``,
          "",
          quoteMarkdown(truncate(resource.content)),
          "",
        );
      });
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeEvaluationOutputs(
  run: RagEvaluationRun,
  outputDirectory: string,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outputDirectory, { recursive: true });
  const baseName = `rag-eval-${run.run_id}`;
  const jsonPath = join(outputDirectory, `${baseName}.json`);
  const markdownPath = join(outputDirectory, `${baseName}.md`);

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(run, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, createMarkdownReport(run), "utf8"),
  ]);

  return { jsonPath, markdownPath };
}
