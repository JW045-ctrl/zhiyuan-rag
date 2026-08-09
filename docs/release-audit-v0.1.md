# 知源 v0.1 公开发布前安全与工程审计

审计日期：2026-08-09

## 当前结论

知源 v0.1 已具备创建公开 GitHub 仓库前的本地代码与文档基线，但当前仍没有公开在线演示，不能把“代码可以公开”理解为“服务已经适合公开部署”。

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 本地 RAG 闭环 | 通过 | 浏览器调用 Next.js `/api/chat`，服务端调用 Dify。 |
| SSE 与真实引用 | 通过 | 回答增量与 Dify `retriever_resources` 均已验证。 |
| Markdown/KaTeX | 通过 | 行内与块级公式有自动测试。 |
| v0.1 最终评估 | 完成 | 15/15请求成功；ANSWER严格通过3/10；REFUSE严格通过5/5。 |
| 冻结配置 | 完成 | Top K、Chunk、Embedding、阈值、Prompt、LLM、Rerank和测试标准不再修改。 |
| 环境变量模板 | 通过 | `.env.example` 与 `.env.local.example` 只有空 Key。 |
| Dify Chatflow DSL | 通过 | DSL 已导出；未发现真实密钥、Bearer值或本机绝对路径。 |
| 许可证 | 完成 | 标准 MIT License；版权用户名保留待替换占位符。 |
| 课程资料排除 | 通过 | Git 没有跟踪 PDF；课程截图、原始评估结果和内部候选诊断均被忽略。 |
| README 本地路径 | 通过 | 仓库文件链接全部存在，没有 Windows 绝对路径或临时图片链接。 |
| 敏感信息扫描 | 通过 | 当前公开候选与现有 Git 历史均未命中高置信度密钥、静态Bearer、数据库密码、私钥或Windows绝对路径。 |

## 最终工程验证

全部命令均在项目根目录执行，没有重新运行付费 RAG 问答评估。

| 检查 | 结果 |
| --- | --- |
| `npm.cmd ci --offline --cache .npm-cache` | 成功，安装703个包，0个已知漏洞 |
| `npm.cmd run test` | 11/11通过 |
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd run build` | 通过；首页、`/assistant` 与 `/api/chat` 均成功构建 |
| `npm.cmd run rag:evaluate:check` | 通过；30题格式有效，启用15题、未启用15题 |

`npm ci` 给出一条依赖脚本审阅提示：`esbuild@0.28.1` 有 postinstall 脚本尚未列入 npm 的 `allowScripts` 清单；本次安装、测试与构建均成功，npm 漏洞审计为0。该提示不等同于发现漏洞，未来升级依赖时仍应继续复核。

## 公开候选范围

本次发布提交包括：

- 面向零基础读者重写的 `README.md`；
- 标准 `LICENSE`；
- `.gitignore` 安全排除规则；
- Dify恢复说明与已导出的 Chatflow DSL；
- 固定 RAG 测试集、Schema、评估脚本与说明；
- 项目术语表、决策记录、最终评估和最终 Chunk 实验报告；
- 现有 Next.js 源码、测试和依赖锁文件。

## 明确排除范围

- `.env.local` 和其他真实环境文件；
- Dify `.env.backup` 及其他环境备份；
- 课程 PDF、课程原文截图和未授权资料；
- `evaluation/results/` 中包含原文的 JSON、Markdown；
- 人工审核全文、检索候选原文和内部调参工作记录；
- `node_modules/`、`.next/`、npm缓存、日志、临时文件和构建缓存；
- 临时截图。当前没有安全公开截图，README 使用 TODO 占位。

## 密钥与引用边界

- `DIFY_API_KEY` 只允许存在于 `.env.local` 或部署平台的服务端 Secret 中；
- 禁止使用 `NEXT_PUBLIC_DIFY_API_KEY`；
- 浏览器只访问本站 `/api/chat`，不会收到 Dify API Key；
- 引用来自 Dify 真实 `retriever_resources`，不由模型编造；
- Dify dataset/document/segment ID 是引用标识，不是访问凭据；
- 重建文档会改变 Segment ID，因此历史原始结果不进入公开仓库。

## 创建 GitHub 仓库前仍需人工确认

1. 把 `LICENSE` 中的 `JW045-ctrl` 替换为真实 GitHub 用户名；
2. 确认公开仓库名称、简介和是否立即开放 Issues；
3. 决定是否先用自行编写的演示资料制作安全截图；
4. 再次确认 Dify DSL 中的知识库绑定在新环境需要手动重连；
5. 公开部署前另外完成域名、HTTPS、匿名频率限制、日志隐私、备份恢复和演示资料授权。

## 公开部署前仍需完成

1. 选择托管方式并配置服务端环境变量；
2. 为匿名 `/api/chat` 增加服务端频率限制、请求体上限和滥用防护；
3. 把 Dify 迁移到网站服务端可访问但管理后台不公开的环境；
4. 明确 Dify 日志保留、隐私说明、数据清理和备份策略；
5. 只使用自行编写、获得授权或允许公开的演示知识资料；
6. 增加公开环境健康检查、错误日志和可用性监控。
