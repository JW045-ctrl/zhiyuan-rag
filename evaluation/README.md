# RAG 评估数据集

`rag-test-cases.json` 固定提供 30 个测试槽位：20 道 `ANSWER` 与 10 道 `REFUSE`。第一批启用 10 道 `ANSWER` 和 5 道 `REFUSE`；剩余题目在资料与人工参考答案确认前保持关闭。

## 填写规则

每题必须包含：

- `id`：稳定、唯一的小写标识；
- `question`：实际发送给 `/api/chat` 的问题；
- `expected_behavior`：`ANSWER` 或 `REFUSE`；
- `expected_documents`：预期命中的 Dify `document_name` 或 `document_id`；
- `reference_answer`：人工整理的要点答案，拒答题填写期望的拒答原则；
- `tags`：章节、题型、难度或来源等标签；
- `enabled`：题目经人工核对后设为 `true`。
- `expected_document_rationale`：`ANSWER` 题为什么预期命中这些文件；
- `refusal_rationale`：`REFUSE` 题为什么在当前知识库中不应回答；
- `allowed_response_scope`：拒答时仍允许说明到什么程度；
- `fabrication_definition`：哪些具体表现属于无依据编造；
- `todo_reason`：关闭题目的待办原因，启用题保持空字符串。

启用 `ANSWER` 题前，`question`、`reference_answer`、`expected_document_rationale` 和至少一个 `expected_documents` 都必须填写。启用 `REFUSE` 题前必须填写 `question`、拒答原则、允许范围和编造定义，`expected_documents` 保持空数组。关闭题必须填写 `todo_reason`。

## 运行

先启动知源网站，再执行：

```powershell
npm.cmd run rag:evaluate:check
npm.cmd run rag:evaluate
```

如网站不在 3000 端口：

```powershell
$env:ZHIYUAN_BASE_URL='http://127.0.0.1:3001'
npm.cmd run rag:evaluate
```

结果会写入 `evaluation/results/`：

- `rag-eval-<时间>.json`：完整机器可读结果，保留完整 `retriever_resources`；
- `rag-eval-<时间>.md`：自动指标、逐题答案、引用摘要和人工评分清单。

结果可能包含受版权约束的课程原文片段，因此默认被 Git 忽略。
