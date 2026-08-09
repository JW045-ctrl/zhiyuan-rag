# 知源

知源是一个面向大一微积分课程资料的学习原型。网站通过服务端调用 Dify Chatflow，实现基于知识库的 SSE 流式问答，并展示 Dify 返回的真实 `retriever_resources`。

当前 v0.1 范围只有：AI 问答、Markdown/KaTeX 渲染和真实引用展示。暂不包含登录、社区、支付、用户上传或多学科功能。

## 环境要求

- Windows 10/11 与 PowerShell；
- Node.js 20.9 或更高版本；
- npm 10 或更高版本；
- 已启动并发布的 Dify Chatflow；
- 一个仅供网站服务端使用的 Dify 应用 API Key。

当前 DSL 按 Dify 1.16.1 导出。使用其他 Dify 版本导入时，应在发布前重新检查节点兼容性。

## 从全新环境启动

在 PowerShell 中进入克隆后的项目目录：

```powershell
Set-Location .\zhiyuan
```

如果当前网络需要本机 VPN 代理，可只为当前 PowerShell 会话设置代理（端口以本机实际配置为准）：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
```

安装锁文件指定的依赖：

```powershell
npm.cmd ci
```

创建本地环境变量文件：

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`，只在等号后填写真实 Dify 应用 API Key：

```dotenv
DIFY_API_BASE_URL=http://localhost/v1
DIFY_API_KEY=
```

启动开发服务器：

```powershell
npm.cmd run dev
```

打开：

- 首页：<http://127.0.0.1:3000>
- AI 学习助手：<http://127.0.0.1:3000/assistant>

如果 3000 端口已被占用，以终端显示的实际端口为准。

## Dify Chatflow 恢复

1. 在 Dify 工作台导入 `dify/chatflow/zhiyuan-calculus-v0.1.yml`；
2. 配置通义千问模型供应商凭据；
3. 创建“大一微积分”知识库并上传授权资料；
4. 将知识检索节点绑定到新知识库；
5. 检查“资料不足时拒答”和引用输出路径；
6. 发布 Chatflow 并创建应用 API Key；
7. 把 Key 写入网站服务器的 `DIFY_API_KEY`，不要写入 DSL 或 Git。

更多说明见 [dify/README.md](dify/README.md)。

## 服务端安全边界

浏览器只向本站发送：

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "query": "用户问题"
}
```

本站服务端再调用 Dify `/chat-messages`。`DIFY_API_KEY` 不使用 `NEXT_PUBLIC_` 前缀，也不会返回给浏览器。

本站 SSE 事件：

- `answer.delta`：回答增量；
- `citations`：Dify `message_end.metadata.retriever_resources` 的真实引用；
- `done`：正常结束；
- `error`：不含凭据的安全错误。

## 工程检查

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
```

生产方式本地验证：

```powershell
npm.cmd run build
npm.cmd run start
```

## RAG 评估

测试集位于 `evaluation/rag-test-cases.json`。先完成人工题目与预期文档，随后把对应题目的 `enabled` 改为 `true`。

只检查 30 题数据格式，不发送请求：

```powershell
npm.cmd run rag:evaluate:check
```

启动网站后批量评估：

```powershell
npm.cmd run rag:evaluate
```

指定网站端口或只运行一题：

```powershell
$env:ZHIYUAN_BASE_URL='http://127.0.0.1:3001'
npm.cmd run rag:evaluate -- --case calc-answer-001
```

结果输出到 `evaluation/results/`，包括完整 JSON 和人工复核 Markdown。该目录可能包含课程原文片段，默认不提交到 Git。

详细字段和填写规则见 [evaluation/README.md](evaluation/README.md)。发布审计见 [docs/release-audit-v0.1.md](docs/release-audit-v0.1.md)。项目的重要选择记录在 [docs/project-decisions.md](docs/project-decisions.md)，非技术术语解释见 [docs/project-glossary.md](docs/project-glossary.md)，首轮 15 题结果分析见 [docs/baseline-analysis.md](docs/baseline-analysis.md)。

## 目录概览

```text
src/app/api/chat/          网站服务端 Dify 代理
src/app/assistant/         最小 AI 问答页面
src/lib/dify/              Dify 客户端、类型和 SSE 解析
dify/                      Chatflow DSL 与恢复说明
evaluation/                30 题数据集、Schema 和结果目录
scripts/                   RAG 评估运行器与测试
data/resources/calculus/   本地课程资料
```
