# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

中国大陆大学生，第一阶段主要服务正在学习大一微积分、需要快速查找课程资料并基于资料获得解释的学生。

## Product Purpose

“知源”帮助学生从课程课件、习题和答案中检索依据，并由 AI 给出带真实来源的学习解释。第一阶段成功标准是完成“提问—检索—回答—核对来源”的可信闭环。

## Positioning

AI 回答只依赖课程知识库，引用直接来自 Dify 的真实 `retriever_resources`，不由模型编造来源；资料不足时应明确拒答。

## Operating Context

第一阶段在 Windows 本机运行，由少量学生使用电脑端浏览。资料存放于本地并手动上传到一门课程对应的 Dify dataset。当前课程为“大一微积分”，只覆盖已确认的三个章节。

## Capabilities and Constraints

- 当前页面范围仅为单轮 AI 问答、流式回答和真实来源展示。
- 浏览器只调用 Next.js `/api/chat`，Dify API Key 仅保存在服务端 `.env.local`。
- 不实现登录、聊天历史、多轮 `conversation_id`、章节筛选、资料上传或 SQLite 跳转。
- 不推测或展示页码、章节和站内链接。
- 来源以 `document_id + segment_id` 去重，并保留 Dify 返回的文件名、分数、原文片段及标识符。

## Brand Commitments

产品名称为“知源”。语气简洁、年轻、专业、克制；第一阶段使用明亮浅色界面，并为后续扩展保留清晰的信息层级。

## Evidence on Hand

- Dify Chatflow 已发布，本地 API 与 SSE 流式回答已验证。
- 已验证真实引用可命中 `assignment-10.pdf` 和 `solution-10.pdf`。
- 首批课程资料位于 `data/resources/calculus/`。
- 当前没有 Logo、正式品牌色或可公开宣称的用户数据，不得编造。

## Product Principles

- 资料依据优先于回答表现。
- 来源必须可核对且不推测。
- 资料不足时明确拒答。
- 第一阶段保持单一任务和最小范围。
- 错误状态应说明问题并给出可执行的恢复方式。

## Accessibility & Inclusion

支持基本键盘操作、清晰文字对比、可见焦点和响应式布局；界面语言为简体中文。

