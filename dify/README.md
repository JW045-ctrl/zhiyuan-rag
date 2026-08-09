# Dify Chatflow

此目录保存“知源”公开 v0.1 对应的 Dify Chatflow DSL，用于在新环境中恢复工作流。

预期文件：

- `chatflow/zhiyuan-calculus-v0.1.yml`：从当前已发布 Chatflow 导出的 DSL。

导入后仍需在目标 Dify 工作区手工完成：

1. 配置通义千问模型供应商凭据；
2. 创建或选择“大一微积分”知识库；
3. 上传授权资料并等待索引完成；
4. 将知识检索节点重新绑定到目标知识库；
5. 发布 Chatflow，创建应用 API Key；
6. 将 API Key 仅写入网站服务端的 `DIFY_API_KEY`。

DSL 可以进入 Git，但导出后仍应检查其中不包含真实 API Key、访问令牌或本机绝对路径。

## v0.1 已冻结配置

- 知识库 Top K：`10`
- Chatflow Top K：`4`
- Chatflow Score 阈值：`0.5`
- Embedding：`text-embedding-v4`
- Rerank：关闭

这些数值是当前微积分资料和15题评估对应的可复现基线，不代表适合其他知识包。v0.1 不再继续调整这些参数；更换资料时应建立新的固定测试集后重新评估。

v0.1 使用 Dify 原生 PDF 解析。数学公式、跨页答案、扫描版和复杂版式仍可能需要额外的文档预处理流程，不能只靠增大 Top K 或 Chunk 解决。
