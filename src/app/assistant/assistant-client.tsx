"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import {
  dedupeRetrieverResources,
  parseZhiyuanSseStream,
} from "@/lib/assistant-stream";
import type { DifyRetrieverResource } from "@/lib/dify/types";
import {
  ArrowUp,
  FileText,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./assistant.module.css";

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_QUERY_LENGTH = 4_000;
const SUGGESTED_QUESTIONS = [
  "项目目前处于什么阶段？",
  "外卖配送为什么移出本期？",
  "优惠券最终叠加规则是什么？",
  "客户验收版本计划什么时候提交？",
];

type RequestStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "completed"
  | "empty"
  | "error";

class StreamResponseError extends Error {}

async function readServiceError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // The recovery message below is intentionally stable and non-sensitive.
  }

  return `服务请求失败（HTTP ${response.status}）`;
}

export function AssistantClient() {
  const [query, setQuery] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<DifyRetrieverResource[]>([]);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isBusy = status === "loading" || status === "streaming";
  const canClear =
    Boolean(query || submittedQuestion || answer || errorMessage) || isBusy;

  useEffect(
    () => () => {
      activeRequestRef.current += 1;
      abortControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const initialQuestion = new URLSearchParams(window.location.search)
      .get("question")
      ?.trim();

    if (initialQuestion) {
      setQuery(initialQuestion.slice(0, MAX_QUERY_LENGTH));
    }
  }, []);

  const clearAssistant = () => {
    activeRequestRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setQuery("");
    setSubmittedQuestion("");
    setAnswer("");
    setSources([]);
    setStatus("idle");
    setErrorMessage("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submitQuestion = async (event?: FormEvent) => {
    event?.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || isBusy) {
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let timedOut = false;
    let streamedAnswer = "";
    let receivedDone = false;

    setSubmittedQuestion(trimmedQuery);
    setAnswer("");
    setSources([]);
    setErrorMessage("");
    setStatus("loading");

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new StreamResponseError(await readServiceError(response));
      }

      if (!response.body) {
        throw new StreamResponseError("服务没有返回可读取的回答流，请重试。");
      }

      for await (const streamEvent of parseZhiyuanSseStream(response.body)) {
        if (activeRequestRef.current !== requestId) {
          return;
        }

        if (streamEvent.event === "answer.delta") {
          streamedAnswer += streamEvent.data.answer;
          setAnswer(streamedAnswer);
          setStatus("streaming");
          continue;
        }

        if (streamEvent.event === "citations") {
          setSources(
            dedupeRetrieverResources(
              streamEvent.data.retriever_resources,
            ),
          );
          continue;
        }

        if (streamEvent.event === "error") {
          throw new StreamResponseError(streamEvent.data.message);
        }

        if (streamEvent.event === "done") {
          receivedDone = true;
        }
      }

      if (!receivedDone) {
        throw new StreamResponseError(
          "回答流意外中断，没有收到完成信号，请重新发送。",
        );
      }

      setStatus(streamedAnswer.trim() ? "completed" : "empty");
    } catch (error) {
      if (activeRequestRef.current !== requestId) {
        return;
      }

      if (timedOut) {
        setErrorMessage("请求超过 90 秒仍未完成，请稍后重试。");
      } else if (error instanceof StreamResponseError) {
        setErrorMessage(error.message);
      } else if (error instanceof DOMException && error.name === "AbortError") {
        setErrorMessage("回答流已中断，请重新发送问题。");
      } else {
        setErrorMessage("服务暂时不可用，请确认本地 Dify 正在运行后重试。");
      }

      setStatus("error");
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRequestRef.current === requestId) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitQuestion();
    }
  };

  const useSuggestedQuestion = (suggestion: string) => {
    if (isBusy) {
      return;
    }

    setQuery(suggestion);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className={styles.pageShell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href="/" aria-label="知源首页">
            <span className={styles.brandMark} aria-hidden="true">
              知
            </span>
            <span>知源</span>
          </Link>
          <nav className={styles.topbarNav} aria-label="项目导航">
            <Link href="/">项目概览</Link>
            <span className={styles.projectLabel}>悦享会员2.0</span>
          </nav>
        </div>
      </header>

      <main className={styles.workspace}>
        <section className={styles.compactHeader} aria-labelledby="assistant-title">
          <div>
            <p className={styles.kicker}>悦享会员2.0</p>
            <h1 id="assistant-title">项目知识助手</h1>
            <p className={styles.headerCopy}>
              查询悦享会员2.0的需求、里程碑、会议决策、需求变更、风险和验收标准。
            </p>
          </div>
          <dl className={styles.statusSummary}>
            <div>
              <dt>当前阶段</dt>
              <dd>内部测试、缺陷修复与客户验收准备</dd>
            </div>
            <div>
              <dt>知识更新至</dt>
              <dd>2032年10月5日</dd>
            </div>
          </dl>
        </section>

        <form className={styles.composer} onSubmit={submitQuestion}>
          <label className={styles.inputLabel} htmlFor="assistant-query">
            你的问题
          </label>
          <textarea
            id="assistant-query"
            ref={textareaRef}
            className={styles.textarea}
            value={query}
            maxLength={MAX_QUERY_LENGTH}
            rows={4}
            disabled={isBusy}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="例如：客户验收版本计划什么时候提交？"
          />
          <div className={styles.composerFooter}>
            <span className={styles.keyboardHint}>
              Enter 发送 · Shift + Enter 换行
            </span>
            <div className={styles.actions}>
              <button
                className={styles.clearButton}
                type="button"
                onClick={clearAssistant}
                disabled={!canClear}
              >
                <RotateCcw aria-hidden="true" size={16} />
                清空
              </button>
              <button
                className={styles.sendButton}
                type="submit"
                disabled={!query.trim() || isBusy}
              >
                {isBusy ? (
                  <LoaderCircle
                    className={styles.spinner}
                    aria-hidden="true"
                    size={17}
                  />
                ) : (
                  <ArrowUp aria-hidden="true" size={17} />
                )}
                {isBusy ? "回答中" : "发送问题"}
              </button>
            </div>
          </div>
        </form>

        <section className={styles.suggestions} aria-labelledby="suggestions-title">
          <p id="suggestions-title">示例问题</p>
          <ul>
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => useSuggestedQuestion(suggestion)}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {status === "idle" ? (
          <section className={styles.emptyState} aria-label="等待提问">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <h2>回答会附带资料依据</h2>
              <p>引用来自本次实际检索到的项目文件与原文片段，不推测资料中未记录的事实。</p>
            </div>
          </section>
        ) : (
          <section
            className={styles.resultGrid}
            aria-live="polite"
            aria-busy={isBusy}
          >
            <article className={styles.answerPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionIndex}>回答</span>
                  <h2>项目回答</h2>
                </div>
                <StatusLabel status={status} />
              </div>

              {submittedQuestion ? (
                <p className={styles.submittedQuestion}>
                  <span>问题</span>
                  {submittedQuestion}
                </p>
              ) : null}

              {isBusy && !answer ? (
                <div className={styles.loadingState} role="status">
                  <span className={styles.loadingDots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  正在检索项目资料…
                </div>
              ) : null}

              {answer ? (
                <div className={styles.answerBody}>
                  <MessageResponse isAnimating={status === "streaming"}>
                    {answer}
                  </MessageResponse>
                  {status === "streaming" ? (
                    <span className={styles.streamCursor} aria-hidden="true" />
                  ) : null}
                </div>
              ) : null}

              {status === "empty" ? (
                <div className={styles.messageState} role="status">
                  <strong>本次没有生成回答。</strong>
                  <span>请换一种更明确的问法后重试。</span>
                </div>
              ) : null}

              {status === "error" ? (
                <div className={styles.errorState} role="alert">
                  <strong>本次请求未完成</strong>
                  <span>{errorMessage}</span>
                </div>
              ) : null}
            </article>

            <aside className={styles.sourcesPanel} aria-labelledby="sources-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionIndex}>依据</span>
                  <h2 id="sources-title">资料依据</h2>
                </div>
                {(status === "completed" || status === "empty") && (
                  <span className={styles.sourceCount}>{sources.length} 条</span>
                )}
              </div>

              {isBusy ? (
                <p className={styles.sourcePlaceholder}>
                  回答结束后显示本次资料依据。
                </p>
              ) : null}

              {(status === "completed" || status === "empty") &&
              sources.length === 0 ? (
                <p className={styles.noSources}>
                  本次回答没有返回可展示的资料依据。
                </p>
              ) : null}

              {(status === "completed" || status === "empty") &&
              sources.length > 0 ? (
                <ol className={styles.sourceList}>
                  {sources.map((source, index) => (
                    <li
                      className={styles.sourceCard}
                      key={`${source.document_id}:${source.segment_id}`}
                    >
                      <div className={styles.sourceCardHeader}>
                        <span className={styles.sourceNumber}>{index + 1}</span>
                        <FileText aria-hidden="true" size={18} />
                        <h3>{source.document_name}</h3>
                      </div>
                      <div className={styles.sourceContent}>
                        <span>原文片段</span>
                        <p>{source.content}</p>
                      </div>
                      <details className={styles.sourceDetails}>
                        <summary>查看检索详情</summary>
                        <dl className={styles.sourceMeta}>
                          <div>
                            <dt>score</dt>
                            <dd>{String(source.score)}</dd>
                          </div>
                          <div>
                            <dt>document_id</dt>
                            <dd>{source.document_id}</dd>
                          </div>
                          <div>
                            <dt>segment_id</dt>
                            <dd>{source.segment_id}</dd>
                          </div>
                        </dl>
                      </details>
                    </li>
                  ))}
                </ol>
              ) : null}
            </aside>
          </section>
        )}

        <p className={styles.disclaimer}>内容仅供项目演示与资料核对，请以已确认的项目文件为准。</p>
      </main>
    </div>
  );
}

function StatusLabel({ status }: { status: RequestStatus }) {
  if (status === "loading") {
    return <span className={styles.statusLabel}>检索中</span>;
  }

  if (status === "streaming") {
    return <span className={styles.statusLabel}>生成中</span>;
  }

  if (status === "error") {
    return <span className={styles.errorLabel}>未完成</span>;
  }

  if (status === "empty") {
    return <span className={styles.emptyLabel}>空回答</span>;
  }

  return <span className={styles.completeLabel}>已完成</span>;
}
