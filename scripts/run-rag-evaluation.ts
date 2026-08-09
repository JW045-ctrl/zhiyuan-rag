import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  parseRagTestDataset,
  runEvaluation,
  writeEvaluationOutputs,
} from "./rag-evaluation";

interface CliOptions {
  baseUrl: string;
  caseIds: string[];
  datasetFile: string;
  dryRun: boolean;
  outputDirectory: string;
  timeoutMs: number;
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} 缺少参数值`);
  }
  return value;
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    baseUrl: process.env.ZHIYUAN_BASE_URL?.trim() || "http://127.0.0.1:3000",
    caseIds: [],
    datasetFile: "evaluation/rag-test-cases.json",
    dryRun: false,
    outputDirectory: "evaluation/results",
    timeoutMs: Number(process.env.RAG_EVAL_TIMEOUT_MS || "120000"),
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--base-url") {
      options.baseUrl = readValue(args, index, argument);
      index += 1;
    } else if (argument === "--dataset") {
      options.datasetFile = readValue(args, index, argument);
      index += 1;
    } else if (argument === "--output-dir") {
      options.outputDirectory = readValue(args, index, argument);
      index += 1;
    } else if (argument === "--timeout-ms") {
      options.timeoutMs = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === "--case") {
      options.caseIds.push(readValue(args, index, argument));
      index += 1;
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms 必须是正数");
  }

  new URL(options.baseUrl);
  return options;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const datasetPath = resolve(options.datasetFile);
  const datasetValue = JSON.parse(await readFile(datasetPath, "utf8")) as unknown;
  const dataset = parseRagTestDataset(datasetValue);
  const enabledCases = dataset.cases.filter((testCase) => testCase.enabled);

  if (options.dryRun) {
    console.log(
      `测试集格式有效：共 ${dataset.cases.length} 题，已启用 ${enabledCases.length} 题，未启用 ${dataset.cases.length - enabledCases.length} 题。`,
    );
    return;
  }

  const run = await runEvaluation({
    baseUrl: options.baseUrl,
    dataset,
    datasetFile: options.datasetFile,
    timeoutMs: options.timeoutMs,
    ...(options.caseIds.length > 0 ? { caseIds: options.caseIds } : {}),
    onCaseStart(testCase, index, total) {
      console.log(`[${index}/${total}] ${testCase.id}`);
    },
  });
  const paths = await writeEvaluationOutputs(
    run,
    resolve(options.outputDirectory),
  );

  console.log(`JSON 结果：${paths.jsonPath}`);
  console.log(`人工报告：${paths.markdownPath}`);
  console.log(
    `完成：${run.metrics.successful_cases}/${run.metrics.attempted_cases} 题无错误。`,
  );

  if (run.metrics.error_cases > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "评估运行失败");
  process.exitCode = 1;
});
