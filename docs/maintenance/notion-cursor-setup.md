# Cursor 连接 Notion MCP 说明（仅 MCP）

本仓库使用 **Notion 官方 MCP**（见 `.cursor/mcp.json`）在 Cursor 中读写 Notion 页面。  
不再使用 Notion API Token 同步脚本。

官方文档：<https://developers.notion.com/guides/mcp/get-started-with-mcp>

## 1. 一次性配置

1. 重启 Cursor（刚更新配置时建议执行）。
2. 打开 `Settings -> MCP`，确认存在 `notion` 服务。
3. 第一次使用 Notion 工具时，完成 OAuth 授权。
4. 在 Notion 中将目标页面/父页面共享给当前授权账号（可编辑）。

## 2. 推荐同步方式（MCP）

Notion MCP 是「对话内读写」模式，不是 Git 式自动双向同步。

推荐工作流：

- 在对话中 `@docs/...` 引用本地文档
- 指定 Notion 目标页面（或父页面）
- 让助手创建/更新页面内容
- 后续继续更新同一 Notion 页面，保持单一文档源

## 3. 常见问题

- **报 `needsAuth` / OAuth 失败**：在 MCP 设置里断开 notion 后重连，再走一次完整 OAuth。
- **可连接但无法写入**：确认目标页面已共享，且账号有编辑权限。
- **`No code verifier saved`**：清理 Notion MCP 授权状态并重试，过程中不要中断或重启。

## 4. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-09 | 初版：MCP + API 双方案说明 |
| 2.0 | 2026-04-09 | 移除 API 同步方案，保留纯 MCP 流程 |
