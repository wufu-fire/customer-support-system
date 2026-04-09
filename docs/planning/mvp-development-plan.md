# MVP 开发计划

> 宠物用品售后服务网站：商品展示（无购买）+ 售后工单 + 中英双语。  
> 与 [PRD](../requirements/mvp-prd.md)、[原型](../prototype/)、[技术架构](../architecture/tech-architecture-react-antd-nestjs.md) 对齐。

## 1. 目标与原则

| 目标 | 说明 |
|------|------|
| 最快竖切 | 优先打通「创建工单 → 查询工单 → 后台处理」闭环，再扩展页面与集成 |
| 契约先行 | API 字段与错误码在实现前冻结一版，减少前后端反复修改 |
| 范围锁死 | 严格按 PRD「本期范围 / 非本期范围」，避免 MVP 膨胀 |
| 部署可演进 | 目标平台 Vercel（见技术架构 §4.1）；本地可跑通后再接线上环境 |

## 2. 参考文档索引

| 文档 | 路径 |
|------|------|
| 需求与验收 | `docs/requirements/mvp-prd.md` |
| 站点地图 | `docs/prototype/site-map.md` |
| 用户流程 | `docs/prototype/user-flows.md` |
| 线框说明 | `docs/prototype/wireframe-spec.md` |
| 中英术语 | `docs/prototype/copy-decision-log.md` |
| 技术架构 | `docs/architecture/tech-architecture-react-antd-nestjs.md` |
| 仓库结构 | `docs/architecture/project-structure.md` |

## 3. 推荐开发顺序（总览）

```
契约/类型（API 草案或 packages/types）
    ↓
apps/api：数据库 + 工单核心 + 商品只读
    ↓
apps/web：售后申请 → 工单查询 → 商品列表/详情 → 首页与法务
    ↓
apps/admin：登录 + 工单列表/详情 + 状态与回复
    ↓
集成：上传、邮件、i18n 补全、Vercel 部署
    ↓
测试与 UAT（对齐 PRD §8）
```

**说明**：邮件、对象存储、管理端鉴权可在第二条竖切稳定后并行或顺延，避免阻塞主链路。

## 4. 阶段划分与交付物

### 阶段 0：工程脚手架（0.5～1 天）

| 任务 | 交付物 |
|------|--------|
| Monorepo 初始化（包管理器、workspace） | 根 `package.json`、workspace 配置 |
| 创建 `apps/web`、`apps/admin`（Vite + React + TS + antd） | 可本地 `dev` 空白页 |
| 创建 `apps/api`（NestJS） | 可本地启动、`/health` 可访问 |
| 创建 `packages/types`（可选先空） | 后续 DTO/枚举迁入 |
| 环境变量示例 | `apps/*/.env.example`（勿提交密钥） |

**完成标准**：三个应用在本地均可启动，无阻塞性构建错误。

---

### 阶段 1：契约与数据模型（0.5～1 天）

| 任务 | 交付物 |
|------|--------|
| 定义 REST 路径与请求/响应形状 | `docs/api/` 下 OpenAPI 草稿或 Markdown 端点表 |
| 工单状态、问题类型枚举 | 与 `copy-decision-log` 术语一致 |
| 数据库表设计（Ticket、Product、Attachment、Reply 等） | migration 脚本或 ORM schema |

**完成标准**：前后端对「创建工单、查询工单、商品列表/详情」字段达成一致。

---

### 阶段 2：后端核心（`apps/api`，2～4 天）

| 顺序 | 模块 | 任务要点 |
|------|------|----------|
| 1 | 数据库 | 迁移、种子商品数据（可选） |
| 2 | Products | 列表、详情、关键词/分类筛选（按 PRD 最小实现） |
| 3 | Tickets | 创建工单、生成工单号、校验必填与枚举 |
| 4 | Tickets | 按工单号 + 邮箱查询（不匹配时统一错误语义，防信息泄露） |
| 5 | 全局 | 统一错误体、`/api/v1` 前缀、CORS 配置 |

**延后（阶段 5 或并行）**：附件上传（预签名或 multipart）、邮件通知、BullMQ。

**完成标准**：用 curl/Thunder Client 可完整走通「创建 → 查询」；商品只读接口可用。

---

### 阶段 3：前台（`apps/web`，3～5 天）

建议页面顺序（对齐原型）：

| 顺序 | 页面 | 说明 |
|------|------|------|
| 1 | Support Request（售后申请） | 对接创建工单 API；表单校验与 antd `Form` |
| 2 | Request Success | 展示工单号；引导去 Track |
| 3 | Ticket Tracking（工单查询） | 工单号 + 邮箱；结果卡片展示状态与最新回复 |
| 4 | Products List / Detail | 对接商品 API；详情页 CTA 跳转售后申请 |
| 5 | Home | Hero、入口卡片、FAQ 简版 |
| 6 | Legal | 隐私政策、服务条款占位或静态文案 |

**i18n**：先打通 `en-US` 主路径，再补 `zh-CN`（与 `packages/i18n` 键一致）。

**完成标准**：PRD §8 中前台相关验收项（1）（2）（3）（6）在联调环境下可通过。

---

### 阶段 4：管理端（`apps/admin`，2～3 天）

| 顺序 | 页面/能力 | 说明 |
|------|-----------|------|
| 1 | Login + JWT（或 Cookie Session） | 仅内部角色 |
| 2 | Ticket List | 筛选、表格、分页 |
| 3 | Ticket Detail | 状态流转、内部备注、对外回复 |
| 4 | 与 API 对齐 | 状态枚举与 PRD / copy-decision-log 一致 |

**完成标准**：PRD §8 第（4）条可满足；工单状态变更后，前台查询可见最新对外回复（若已实现回复存储）。

---

### 阶段 5：集成与完善（2～4 天）

| 任务 | 说明 |
|------|------|
| 图片上传 | 与架构文档一致：预签名 + OSS 或 Vercel Blob |
| 邮件 | 提交确认、状态变更；失败重试或日志可查 |
| 限流与安全 | 工单查询接口防爆破；上传类型与大小限制 |
| Vercel | 三个 Project 或等价结构；环境变量与 SPA rewrites |
| `docs/api/` | 与实现同步的最终 OpenAPI 或端点说明 |

**完成标准**：PRD §8（5）及非功能需求中的安全与部署相关项可演示或可查。

---

### 阶段 6：测试与发布（2～3 天）

| 类型 | 范围 |
|------|------|
| API 集成测试 | `tests/api`：工单创建、查询、权限 |
| E2E（可选 MVP+） | `tests/e2e`：提交 → 后台改状态 → 前台查询 |
| UAT | 按 PRD §8 勾选清单 |
| 发布检查 | 见 `docs/maintenance/`（可补充 release checklist） |

## 5. 与 PRD 两周里程碑的对应关系

| PRD 时间盒 | 本计划对应阶段 |
|------------|----------------|
| 第 1～2 天：PRD/流程确认 | 已完成文档；进入阶段 0～1 |
| 第 3～5 天：API 与数据模型 | 阶段 1～2 |
| 第 6～8 天：前台 + 双语 | 阶段 3 |
| 第 9～10 天：后台 | 阶段 4 |
| 第 11～12 天：测试与 UAT | 阶段 5 收尾 + 阶段 6 |
| 第 13～14 天：上线 | 阶段 6 + Vercel Production |

若人力为单人全栈，可将阶段 5 的邮件/上传拆到「上线后迭代」，以保证竖切按期演示。

## 6. 风险与缓冲（执行层）

| 风险 | 应对 |
|------|------|
| NestJS 上 Vercel 冷启动/超时 | 先本地 + 传统 Node 托管验证逻辑，再切 Serverless；长任务异步化 |
| 双语延期 | 先英文明文硬编码路径打通，再批量迁键 |
| 第三方邮件/存储不稳定 | MVP 可开关特性位；先记录日志再补重试 |

## 7. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-09 | 初版：MVP 开发顺序与阶段交付物 |
