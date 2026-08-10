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

## v0.1 最终基线

当前30题中启用15题：10道 ANSWER 和5道 REFUSE。v0.1 已冻结题目与严格证据标准，不再通过改题迎合当前结果。

最终公开报告见 [`docs/v0.1-final-evaluation.md`](../docs/v0.1-final-evaluation.md)。公开报告只保留指标、失败分类和必要说明；包含课程原文的原始 JSON 与 Markdown 继续只保存在本地。

## v0.2 独立企业项目测试集

v0.2不复用或覆盖微积分测试题，独立测试集位于：

```text
knowledge-packs/project-delivery-demo/evaluation/project-delivery-test-cases.json
```

该文件同样保留30个槽位，当前启用10道ANSWER和5道REFUSE。知识包、最终冻结配置、Baseline到exp02实验过程、人工严格评估结果和适用边界见 [`knowledge-packs/project-delivery-demo/README.md`](../knowledge-packs/project-delivery-demo/README.md)。

v0.2的5道REFUSE题人工复核均通过，但现有自动检测器没有覆盖“未提供”“未定义”“没有具体日期”和“待确认”等表达，因此自动结果为0/5。公开结论同时保留自动结果和人工复核结果，不把评估工具的短语覆盖问题解释为RAG拒答能力为0/5。
