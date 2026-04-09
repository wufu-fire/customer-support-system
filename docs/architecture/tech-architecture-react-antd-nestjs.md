# 技术架构文档：React + Ant Design + NestJS

> 面向宠物用品售后服务网站 MVP（商品展示、售后工单、中英双语）。与 `docs/requirements/mvp-prd.md`、`docs/architecture/project-structure.md` 对齐。

## 1. 文档目的与读者

| 读者 | 用途 |
|------|------|
| 全栈 / 前端 / 后端 | 统一技术选型、模块边界、接口约定 |
| 运维 / DevOps | 部署拓扑、环境变量、健康检查 |
| 后续协作 | 扩展功能时的约束与演进方向 |

---

## 2. 技术栈总览

| 层级 | 技术 | 说明 |
|------|------|------|
| 前台 Web | React 18+、TypeScript、Vite | SPA 或 SSR 按需选型（MVP 推荐 SPA + 静态托管） |
| UI | Ant Design 5.x、`@ant-design/icons` | 表单、表格、布局、国际化与 a11y 基础能力 |
| 路由 | React Router 6 | 前台 `/`、后台 `/admin/*` 分域路由 |
| 国际化 | `react-i18next` 或 Ant Design `ConfigProvider` + `locale` | `en-US` / `zh-CN`，与 `packages/i18n` 文案键对齐 |
| 后台管理 Web | 同上（独立应用或同仓多入口） | 与前台共享 `packages/ui`、`packages/types` |
| 服务端 | Node.js LTS、NestJS 10+ | 模块化、依赖注入、与 OpenAPI 天然契合 |
| API 风格 | REST + JSON | 版本前缀建议 `/api/v1` |
| 校验 | `class-validator` + `class-transformer` | DTO 与 OpenAPI 文档一致 |
| 持久化 | PostgreSQL（推荐）或 SQLite（仅本地/MVP 极简） | 工单、商品、附件元数据 |
| 对象存储 | S3 兼容（如 R2、MinIO、AWS S3） | 售后图片凭证 |
| 邮件 | SMTP 或 SendGrid / Resend 等 HTTP API | 提交确认、状态变更通知 |
| 鉴权（后台） | JWT（Access + 可选 Refresh）或 Session + HttpOnly Cookie | 仅 `admin` 需登录；前台工单查询用「工单号+邮箱」业务校验 |
| 托管（目标） | **Vercel** | 前台/管理端静态部署；API 以 Serverless 形态部署（见第 4.1 节） |

---

## 3. 系统上下文与逻辑架构

```mermaid
flowchart TB
  subgraph clients [客户端]
    Web[React + Ant Design 前台]
    Admin[React + Ant Design 管理端]
  end

  subgraph api [NestJS API]
    GW[HTTP / CORS / 限流]
    ModP[Products 模块]
    ModT[Tickets 模块]
    ModU[Upload 模块]
    ModN[Notifications 邮件]
    ModA[Auth 模块]
  end

  subgraph data [数据与外部]
    DB[(PostgreSQL)]
    OSS[(对象存储)]
    Mail[邮件服务]
  end

  Web --> GW
  Admin --> GW
  GW --> ModP
  GW --> ModT
  GW --> ModU
  GW --> ModN
  GW --> ModA
  ModP --> DB
  ModT --> DB
  ModU --> OSS
  ModN --> Mail
  ModA --> DB
```

### 3.1 边界说明

- **前台**：无登录；提交工单、上传图片、按工单号+邮箱查询；只读商品。
- **管理端**：登录后操作工单状态、内部备注、对外回复；只读/维护商品（MVP 可先种子数据或简单 CRUD）。
- **API**：单一 Nest 应用部署；通过环境区分 `NODE_ENV`；生产启用 HTTPS、CORS 白名单。生产环境由 Vercel 提供 HTTPS 与边缘路由（见第 4.1 节）。

---

## 4. 仓库与部署形态（与 monorepo 对齐）

推荐与现有规划一致：

```text
apps/
  web/          # 顾客站（Vite + React + antd）
  admin/        # 客服后台（Vite + React + antd）
  api/          # NestJS
packages/
  types/        # DTO、枚举、API 路径常量（可与 OpenAPI 生成互相同步）
  i18n/         # 前后台共用文案键（可选）
  ui/           # 跨应用小组件（若 antd 已覆盖则可变薄）
```

**部署总述（MVP 目标：Vercel）**

- **`apps/web`、`apps/admin`**：构建为静态资源，部署到 **Vercel**（每个应用一个 Project，或 Monorepo 下通过 Root Directory 分别指向子目录）。
- **`apps/api`（NestJS）**：以 **Vercel Serverless Functions** 暴露 HTTP（单入口转发到 Nest 或按路由拆分）；注意执行时长与冷启动限制（见下）。
- **数据库 / 对象存储 / 邮件**：仍使用**外部托管服务**（如 Neon / Supabase / Vercel Postgres、S3 兼容存储、Resend 等），由 Vercel 上的 API 通过环境变量连接。

### 4.1 部署架构（Vercel）

#### 拓扑示意

```mermaid
flowchart LR
  subgraph vercel [Vercel]
    WEB[Project: web 静态]
    ADM[Project: admin 静态]
    API[Project: api Serverless]
  end

  U[用户浏览器] --> WEB
  U --> ADM
  WEB --> API
  ADM --> API
  API --> DB[(PostgreSQL 托管)]
  API --> OSS[(对象存储)]
  API --> Mail[邮件 API]
```

#### 前台与管理端（Vite + React + Ant Design）

| 项 | 建议 |
|----|------|
| 构建命令 | 各应用目录内 `npm run build`（输出一般为 `dist/`） |
| Output | **Static**；`vercel.json` 中配置 SPA 回退：`routes` 或 `rewrites` 将非文件请求指向 `index.html` |
| 环境变量 | `VITE_API_BASE_URL`（或等价前缀）指向生产 API 的绝对 URL（如 `https://api.xxx.vercel.app` 或自定义域） |
| 多环境 | Production / Preview：在 Vercel 项目 **Environment Variables** 中分别为 Production、Preview、Development 配置不同 `VITE_API_BASE_URL` |
| 自定义域名 | 在各自 Project 的 **Domains** 中绑定（如 `www.example.com` 与 `admin.example.com`） |

#### API（NestJS on Vercel）

Vercel 以 **无状态、短时** 的 Serverless 函数运行 Node，与传统常驻 Node 进程不同，需在架构上对齐：

| 项 | 说明 |
|----|------|
| 集成方式 | 常见做法：使用 **`@vercel/node`** 或官方 Node runtime，提供 **`api/` 目录下单入口**（如 `api/index.ts`），在入口内用 `serverless-http`（或等价）将 Express/Nest 应用包装为 Vercel Handler；或将 Nest 构建为可在一个函数内启动的紧凑应用。 |
| 路由 | `vercel.json` 中把 `/api/*`（或全局）rewrite 到该 Serverless 函数；Nest 全局前缀保持 `/api/v1` 与文档一致。 |
| 执行时长 | 受当前套餐的 **Serverless Function max duration** 限制；长耗时任务（大文件处理、批量邮件）应改为异步队列或边缘外 worker，MVP 可先缩短同步路径。 |
| 冷启动 | 首次请求或闲置后会有延迟；可通过保持依赖精简、避免过大 bundle、Pro 档等缓解。 |
| WebSocket | Serverless 不适合长连接；若未来需要实时能力，改用 **SSE、轮询或独立长连服务**。 |
| 队列 | **BullMQ + Redis** 在纯 Serverless 上需外部 Redis（如 Upstash）；MVP 可同步发邮件，后续再抽队列。 |

#### 环境变量与安全（Vercel）

- 在 **API Project** 中配置：`DATABASE_URL`、对象存储密钥、邮件 API Key、`JWT_SECRET` 等；**勿**提交到仓库。
- **CORS**：Nest 中 `origin` 白名单填写 `web`、`admin` 的 Vercel 生产域与 Preview 域（可使用通配子域或维护允许列表）。
- **Preview 部署**：每个 Git 分支可生成独立 Preview URL；若 API 也需按分支预览，可为 Preview 环境单独配置一套数据库或 schema（团队规范自定）。

#### Monorepo 在 Vercel 上的配置要点

- 在 Vercel 为 **web / admin / api** 各建一个 Project，**Root Directory** 分别设为 `apps/web`、`apps/admin`、`apps/api`。
- **Install Command** 若在根目录安装依赖：`cd ../.. && npm ci`（按实际包管理器调整），或使用 Turborepo / pnpm workspace 的 `filter` 仅安装所需子图。
- **Ignored Build Step**：可选，用于仅当对应路径变更时才构建（节省额度）。

#### 与 Vercel 生态可选集成

- **Vercel Postgres / KV / Blob**：可简化数据库与文件托管（与文档中的「外部 PostgreSQL / S3」可二选一或组合）。
- **Vercel Marketplace**：一键接入 Neon、Upstash 等，仍通过环境变量供 Nest 使用。

#### 备选（API 不放在 Vercel 时）

若后续 Nest 需要 **常驻进程、WebSocket、长任务**，可将 **仅 API** 部署到容器平台（Fly.io、Railway、AWS ECS 等），**web / admin 仍保留在 Vercel**；本文档以「全栈优先上 Vercel」为 MVP 默认叙述。

---

## 5. 前端架构（React + Ant Design）

### 5.1 应用分层

| 层 | 职责 | 示例 |
|----|------|------|
| `pages/` | 路由级页面，组合布局与业务块 | `HomePage`, `SupportRequestPage` |
| `features/` | 按领域拆分的容器与逻辑 | `tickets/`, `products/` |
| `components/` | 通用展示组件 | 封装 antd 的 `PageHeader`、`ResultLayout` |
| `api/` | Axios/fetch 封装、拦截器、错误映射 | `client.ts`, `ticketsApi.ts` |
| `hooks/` | 数据请求、表单、媒体查询 | `useTicketQuery` |
| `routes/` | 路由表与懒加载 | `createBrowserRouter` |
| `i18n/` | 资源加载与语言切换 | 与 `packages/i18n` 同步 |

### 5.2 与 Ant Design 的约定

- 使用 `ConfigProvider` 统一主题（主色、圆角、字体），便于品牌一致。
- 表单：`Form` + `rules` 与后端 DTO 校验错误码对齐（见第 7 节）。
- 表格：管理端工单列表用 `Table` + 服务端分页/排序/筛选参数。
- 上传：`Upload` 与后端预签名 URL 或直传策略一致；限制 `accept`、数量、大小与 PRD 一致。

### 5.3 状态与数据获取

- **MVP**：以 **React Query (TanStack Query)** 或 **SWR** 管理服务端状态；本地 UI 状态用 `useState`/`useReducer`。
- 避免在 MVP 阶段引入过重全局状态库，除非多页面强共享。

### 5.4 安全与体验（前台）

- 不在前端存放密钥；上传走短期凭证或后端代理。
- 工单查询：防止枚举与信息泄露——错误提示统一为「无法找到匹配的工单，请核对工单号与邮箱」（与 PRD 一致）。

---

## 6. 后端架构（NestJS）

### 6.1 模块划分（建议）

| 模块 | 职责 |
|------|------|
| `AppModule` | 全局中间件、配置、健康检查 |
| `ConfigModule` | `@nestjs/config` 加载 `.env`，校验必填项 |
| `DatabaseModule` | TypeORM / Prisma / Drizzle 任选其一，统一迁移策略 |
| `ProductsModule` | 商品只读 API（列表、详情、搜索） |
| `TicketsModule` | 工单创建、查询（工单号+邮箱）、状态流转（内部） |
| `AttachmentsModule` | 上传凭证：签发上传 URL 或接收 multipart 后转存 OSS |
| `NotificationsModule` | 异步发送邮件（队列可选：BullMQ + Redis） |
| `AuthModule` | 管理端登录、JWT 守卫、`RolesGuard` |
| `HealthModule` | `/health` 供编排探活 |

### 6.2 分层约定

- **Controller**：HTTP 映射、DTO 绑定、状态码；不写业务规则。
- **Service**：领域逻辑、事务边界。
- **Repository / ORM**：持久化；复杂查询可下沉 Query 对象。
- **DTO**：`class-validator` 装饰器与 Swagger 元数据一致。

### 6.3 API 设计要点

- 统一前缀：`/api/v1`。
- 统一错误体：`{ code: string, message: string, details?: unknown }`，HTTP 状态码语义正确（400 校验、401/403 鉴权、404 资源、409 冲突等）。
- 使用 `@nestjs/swagger` 生成 OpenAPI，与 `packages/types` 或前端 Orval/ openapi-typescript 同步（可选自动化）。

### 6.4 工单与商品核心模型（逻辑）

- **Product**：id、多语言字段（name/description 等）、分类、图片 URL、规格 JSON。
- **Ticket**：ticketNo（对外展示）、email（哈希或规范化存储视安全策略）、状态枚举、问题类型、描述、时间戳。
- **TicketAttachment**：ticketId、storageKey、mime、size。
- **TicketReply**：区分 internal / public，供查询页展示最新对外回复。

（具体表结构在实现阶段落到 migration 与 `docs/api/`。）

---

## 7. 前后端协作契约

1. **单一事实来源**：接口字段名、枚举值以 OpenAPI 或 `packages/types` 为准。
2. **分页**：`page`、`pageSize`、`total`；或 cursor 分页（若列表很大再演进）。
3. **上传**：先 `POST /uploads/presign` 再直传 OSS，或 `POST /tickets/:id/attachments` multipart（MVP 可二选一）。
4. **i18n**：后端校验错误码稳定，前端用错误码映射中英文文案。

---

## 8. 安全架构（MVP 必做项）

| 项 | 做法 |
|----|------|
| 传输 | 全站 HTTPS |
| CORS | 仅允许前台/管理端来源 |
| 鉴权 | 管理端 JWT + 短期过期；刷新策略按团队习惯 |
| 工单查询 | 校验邮箱+工单号匹配；限流防爆破 |
| 上传 | 类型与大小限制；病毒扫描可后置 |
| 日志 | 不落库用户敏感原文到非必要日志；PII 脱敏 |
| 依赖 | `npm audit` / Dependabot；Nest 与 Node LTS 跟进 |

---

## 9. 可观测性与运维

- **日志**：结构化 JSON（pino / nest-logger），请求 id 贯通。
- **指标**：HTTP 延迟、5xx 率、队列深度（若用队列）。
- **探活**：`GET /health`（DB 可选探测）。
- **配置**：12-factor，密钥不进镜像；用环境变量或密钥管理服务。

---

## 10. 测试策略

| 类型 | 范围 |
|------|------|
| 单元测试 | Nest Service 纯逻辑；前端工具函数 |
| API 集成测试 | Supertest + 测试数据库 |
| E2E | Playwright：`提交工单 → 后台改状态 → 前台查询`（`tests/e2e`） |

---

## 11. 演进路线（非 MVP）

- 实时通知（WebSocket / SSE）。
- 工单评论线程、附件多版本。
- 多客服角色与审计日志强化。
- 国际化扩展更多语言；CMS 管理商品文案。
- 从 SPA 迁到 Next.js 仅在有 SEO/SSR 强需求时评估。

---

## 12. 相关文档

- 需求：`docs/requirements/mvp-prd.md`
- 开发计划：`docs/planning/mvp-development-plan.md`
- 仓库结构：`docs/architecture/project-structure.md`
- 原型：`docs/prototype/`
- API 细则：后续补充 `docs/api/`（OpenAPI 或端点说明）

---

## 13. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-09 | 初版：React + antd + NestJS 全栈架构 |
| 1.1 | 2026-04-09 | 增加 Vercel 部署拓扑、web/admin/api 配置要点与 Nest Serverless 约束 |
| 1.2 | 2026-04-09 | 相关文档增加开发计划链接 |
