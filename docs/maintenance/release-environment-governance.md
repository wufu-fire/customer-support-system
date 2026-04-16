# 发布与环境治理规范

> 适用于本仓库：**前端（`apps/web`、`apps/admin`）托管于 Vercel，后端（`apps/api`）与 PostgreSQL 托管于 Railway** 的部署形态。与 `docs/architecture/tech-architecture-react-antd-nestjs.md`、PRD 对齐。

## 1. 文档目的与适用范围

| 读者 | 用途 |
|------|------|
| 开发 | 分支策略、环境变量命名、本地与预发联调 |
| 运维 / 负责人 | 发布顺序、回滚、密钥与访问控制 |
| 评审 | PR 是否满足环境隔离与迁移要求 |

**适用范围**：本仓库内应用与关联基础设施（Vercel Projects、Railway Services、托管 PostgreSQL）。不包含第三方账单与法务条款。

---

## 2. 环境定义与隔离原则

### 2.1 环境层级

| 环境 | 代号 | 用途 | 数据性质 |
|------|------|------|----------|
| 本地 | `local` | 开发调试 | 本地 Docker Postgres 或开发者自有库，**禁止**连接生产库 |
| 预发 | `staging` | 联调、回归、验收 | **独立**预发数据库；可含脱敏或合成数据 |
| 线上 | `production` | 真实用户流量 | 生产数据；变更需审批与窗口 |

**强制规则**：

- 预发与线上 **必须** 使用 **不同的** PostgreSQL 实例（或至少不同 database / 不同连接串），禁止共用同一生产库。
- 密钥、JWT、第三方 API Key **按环境拆分**，禁止跨环境复用同一组 secret。
- `CORS_ORIGINS` **按环境** 仅列出该环境对应的前端域名（见第 6 节）。

### 2.2 可选：开发环境 `development`

若团队使用 Vercel Preview / Railway 临时环境，视为 **短期预览**，仍须指向 **非生产** 数据库，且 URL 不得写入对外文档作为正式入口。

---

## 3. 分支与发布流

### 3.1 推荐分支模型（与 `docs/architecture/project-structure.md` 一致）

| 分支 | 作用 | 部署目标 |
|------|------|----------|
| `main` | 可发布主线；仅合并已验证变更 | **production**（经审批与检查清单） |
| `develop`（或 `staging`） | 集成与预发验证 | **staging** |
| `feat/*`、`fix/*` | 功能与修复 | 通过 PR 合并入 `develop`，必要时开 Preview |

**发布晋升路径（建议）**：

1. 功能分支 → PR → 合并到 `develop` → 自动/手动部署 **staging** → 验收通过  
2. `develop` → PR → `main` → 部署 **production**（见第 8 节清单）

**端到端逐步操作**（分支开发、首次搭建预发/生产、Vercel 与 Railway 配置项）：见 **第 13 节**。

### 3.2 PR 与发布说明要求

每个影响行为或配置的 PR 须在描述中包含：

- 环境：`staging` / `production` / 仅本地  
- 是否涉及：**数据库迁移**、**环境变量**、**CORS**、**破坏性 API**  
- 回滚要点（若适用）

涉及架构或环境策略变更时，应在 `docs/adr/` 增加 ADR（见仓库维护规则）。

---

## 4. 配置与密钥规范

### 4.1 通用原则

- **十二要素**：配置通过环境变量注入，**禁止**在代码库中提交真实密钥、连接串、私钥。
- 仓库仅保留 **示例**：各 app 的 `.env.example`（或根目录说明），不含真实值。
- 生产与预发的密钥 **轮换策略** 由负责人定义；泄露后立即轮换并审计访问日志。

### 4.2 命名约定（后端 `apps/api`）

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | Node 运行模式 | `production` |
| `APP_ENV` | 业务环境标识（可选，便于日志） | `staging` / `production` |
| `PORT` | 监听端口 | 由 Railway 注入 |
| `DATABASE_URL` | PostgreSQL 连接串 | 各环境独立 |
| `API_PREFIX` | API 全局前缀 | `api/v1` |
| `CORS_ORIGINS` | 允许的前端 Origin，逗号分隔 | 见第 6 节 |
| `JWT_SECRET` 等 | 鉴权与第三方 | 各环境独立 |

### 4.3 命名约定（前端 `apps/web`、`apps/admin`）

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | **完整** API 根路径，须含 scheme 与 `API_PREFIX`，如 `https://api-staging.example.com/api/v1` |

**注意**：`VITE_*` 会打入前端构建产物，**不得**存放服务端密钥。

---

## 5. 各平台环境映射

### 5.1 Vercel（`web` / `admin`）

| 概念 | 建议 |
|------|------|
| Project | **至少** 两套：`web-staging` + `web-prod`（admin 同理），或同一 Project 下用 **Preview vs Production** 区分并配不同环境变量 |
| Root Directory | `apps/web` / `apps/admin` |
| Build | `npm run build`；Output `dist` |
| 环境变量 | **Production** 与 **Preview** 分别配置 `VITE_API_BASE_URL` |

**规则**：生产前端域名只指向 production 构建；预发 URL 不得作为对外正式入口。

### 5.2 Railway（`api` + PostgreSQL）

| 概念 | 建议 |
|------|------|
| Project | 可为 **staging** 与 **production** 各建 Railway Project，或同一 Project 内 **两套 Service + 两套 Postgres**（命名清晰即可） |
| Service Root | `apps/api` |
| Build | `npm ci`（或 `npm install`）→ `npm run build` → `npx prisma generate` |
| Start | `npm run start:prod` |
| 数据库 | 每个环境独立 Postgres；`DATABASE_URL` 仅注入对应 API Service |

### 5.3 域名与 URL 清单（维护责任人填写）

在团队内部维护一张表（可放在 Notion / 内部 Wiki），至少包含：

| 环境 | Web URL | Admin URL | API Base（含 `/api/v1`） |
|------|---------|-----------|---------------------------|
| staging | | | |
| production | | | |

发布前核对 **前端 `VITE_API_BASE_URL`** 与 **后端实际公网域名** 一致。

---

## 6. CORS 与跨域

- 后端 `CORS_ORIGINS` **仅** 列出该 API 环境所服务的前端 Origin（协议 + 主机 + 端口，无路径）。
- **staging** API 只放行 **staging** 前端域名；**production** API 只放行 **production** 前端域名。
- 新增 Vercel Preview 域名时：短期可临时加入 `CORS_ORIGINS`，或采用团队统一的 Preview 域名策略，避免列表无限膨胀。

---

## 7. 数据库与 Prisma 治理

### 7.1 命令边界

| 命令 | 使用场景 | 禁止 |
|------|----------|------|
| `prisma migrate dev` | **仅本地** 开发，生成 migration 文件 | **禁止** 对 staging/production 库执行 |
| `prisma migrate deploy` | **staging / production** 发布流程中应用已有 migration | 在无可信 `DATABASE_URL` 时执行 |
| `prisma db push` | 仅限本地快速试验 | **禁止** 用于生产 schema 治理 |

### 7.2 迁移文件与评审

- 所有 schema 变更 **必须** 以 `apps/api/prisma/migrations/` 下 SQL 文件形式进入版本库。
- 含 **删表/删列/改类型** 的 migration 须 **额外评审**（数据备份、回填、兼容期）。

### 7.3 发布中的执行顺序（推荐）

1. 合并已通过 CI 的代码到目标分支。  
2. 部署 API 新版本（镜像/构建产物就绪）。  
3. 在 **对应环境** 执行 `npx prisma migrate deploy`（常置于 Railway Release/Post-deploy，或等价自动化步骤）。  
4. 探活与冒烟（见第 9 节）。  
5. 前端部署或刷新（若仅后端变更可跳过前端）。

**禁止**：在 migration 未成功时对外宣称发布完成。

---

## 8. CI/CD 门禁（建议）

在合并到 `develop` / `main` 前，流水线至少包含：

| 检查项 | 说明 |
|--------|------|
| Lint / Typecheck | `apps/api`、`apps/web`、`apps/admin` 按项目脚本 |
| 单元测试 | API 与关键前端逻辑（按团队阶段逐步加严） |
| 构建 | 各 app `build` 成功 |

发布 **production** 前建议增加：

- API 对 **staging** 的冒烟（创建工单等核心路径）  
- 涉及 DB 时：确认 migration 已在 **staging** 验证

---

## 9. 发布检查清单

### 9.1 预发（staging）发布前

- [ ] PR 已描述环境、迁移、环境变量变更  
- [ ] `DATABASE_URL` 指向预发库  
- [ ] `CORS_ORIGINS` 包含预发 Web/Admin 域名  
- [ ] `VITE_API_BASE_URL`（两前端）指向预发 API  
- [ ] `prisma migrate deploy` 在预发已成功（或将在本发布步骤中成功）  
- [ ] 冒烟：创建工单、查询工单、（如有）管理端改状态  

### 9.2 线上（production）发布前

- [ ] 已在 staging 完成同版本或等价变更验证  
- [ ] 生产密钥未在聊天/PR 中泄露；轮换已完成（若曾泄露）  
- [ ] `CORS_ORIGINS` 仅生产前端域名  
- [ ] 前端环境变量为生产 API  
- [ ] 维护窗口与干系人已沟通（若有大迁移或停机）  
- [ ] 回滚方案已知（代码回滚版本 + migration 是否可逆）  

### 9.3 发布后（两环境通用）

- [ ] 健康检查与核心接口 HTTP 状态正常  
- [ ] 错误率无异常突增（日志/监控）  
- [ ] 若失败，按第 10 节执行回滚或 hotfix  

---

## 10. 回滚策略

### 10.1 应用回滚

- **Vercel / Railway**：回滚到上一稳定 **Deployment / Release**（以平台能力为准）。  
- 回滚后确认 **环境变量** 仍与当时版本匹配。

### 10.2 数据库回滚

- **原则**：优先 **向前修复**（新 migration 修正），避免直接在生产执行 `migrate reset`。  
- 已应用的 migration **撤销** 需单独设计 migration，并在 staging 先验证。

### 10.3 前后端版本错配

- 若仅后端回滚：确认前端仍兼容旧 API；若不兼容，需同步回滚前端或发兼容补丁。

---

## 11. 可观测性与事故响应

### 11.1 最低要求

- API 提供 `/health`（或等价）供编排探活。  
- 日志包含：**时间、级别、`APP_ENV`（若配置）、请求路径、状态码**；生产日志避免打印完整 PII。  
- 关键业务路径（工单创建失败率）建议有简单告警或定期人工巡检。

### 11.2 事故分级（示例）

| 级别 | 情形 | 动作 |
|------|------|------|
| P1 | 生产完全不可用 | 立即回滚或切流，通知负责人 |
| P2 | 核心路径部分失败 | 限流、降级、hotfix |
| P3 | 非核心功能异常 | 排期修复 |

---

## 12. 职责分工（建议）

| 角色 | 职责 |
|------|------|
| 发布负责人 | 执行发布清单、确认迁移与回滚点 |
| 开发 | PR 说明、迁移文件、本地与 staging 验证 |
| 负责人 | 生产密钥、域名、账单与合规 |

---

## 13. 端到端操作手册（分支 → 预发 → 线上）

本节将第 2～7 节的规则落实为**可执行步骤**：分支命名、日常开发、首次搭建预发/生产时的 Vercel 与 Railway 配置，以及合并后的发布动作。

### 13.1 分支命名速查

| 类型 | 命名模式 | 示例 |
|------|----------|------|
| 功能 | `feat/<范围>-<简述>` | `feat/ticket-upload-image` |
| 修复 | `fix/<范围>-<简述>` | `fix/cors-admin-origin` |
| 预发集成 | `develop`（或团队约定的 `staging`） | 长期存在，接收已评审 PR |
| 可发布主线 | `main` | 仅合并已在预发验证的变更 |

**约定**：在 `feat/*` 或 `fix/*` 上开发，通过 PR 合并入 `develop`；预发验收通过后，再由 PR 将 `develop` 合并入 `main` 触发线上发布。

### 13.2 环境、Git 与平台对应总表

| 环境 | 典型 Git 分支 | Vercel（建议） | Railway（建议） |
|------|---------------|----------------|-----------------|
| 本地 `local` | `feat/*`、`fix/*` | 不部署 | 不部署；数据库用 `infra/docker` 或本地库 |
| 预发 `staging` | `develop` | `web-staging`、`admin-staging` 两 Project（Root 分别为 `apps/web`、`apps/admin`），Production 分支绑定 `develop` | `api-staging`（Root `apps/api`）+ **独立** `postgres-staging` |
| 线上 `production` | `main` | `web-prod`、`admin-prod`（同上 Root），Production 分支绑定 `main` | `api-prod` + **独立** `postgres-prod` |

**隔离**：预发与生产必须使用**不同** `DATABASE_URL`、不同 API 公网域名、不同 `VITE_API_BASE_URL`、不同 `CORS_ORIGINS`。

### 13.3 阶段 A：日常开发（功能分支）

1. 基于 `develop` 更新并创建分支：  
   `git checkout develop && git pull && git checkout -b feat/<范围>-<简述>`  
2. 本地仅连接**本地/开发用**数据库；**禁止**在代码或提交中写入生产 `DATABASE_URL`。  
3. 修改 `schema.prisma` 后仅在本地执行：  
   `npm run prisma:migrate --prefix apps/api -- --name <描述>`  
   将生成的 `apps/api/prisma/migrations/*` **一并提交**。  
4. 推送远程，开 **PR → `develop`**；PR 描述按第 3.2 节填写（迁移、环境变量、CORS 等）。

### 13.4 阶段 B：首次搭建预发（staging）

#### Railway（预发 API + 数据库）

1. 新建 Railway **Project**（建议命名含 `staging`，如 `customer-support-staging`）。  
2. **Add** → **Database** → **PostgreSQL**；在 API 服务中 **Reference** 或手动配置 **`DATABASE_URL`**，确保仅预发 API 使用该库。  
3. **Add** → **GitHub Repo** → 选择本仓库；在 Service **Settings** 中设置 **Root Directory** = **`apps/api`**。  
4. **部署分支**：绑定 **`develop`**（或团队约定的预发分支）。  
5. **Variables**（预发 API）建议至少包含：  
   - `DATABASE_URL`（来自预发 Postgres）  
   - `API_PREFIX` = `api/v1`  
   - `NODE_ENV` = `production`（可选再设 `APP_ENV=staging` 便于日志区分）  
   - `CORS_ORIGINS` = 预发 **Web** 与 **Admin** 的完整 Origin，逗号分隔、无路径，例如：  
     `https://<web-staging>.vercel.app,https://<admin-staging>.vercel.app`  
   - 其他：`JWT_SECRET`、对象存储、邮件等按预发策略独立配置  
6. **Build Command**（示例）：  
   `npm ci && npm run build && npx prisma generate`  
7. **Start Command**：`npm run start:prod`  
8. **首次**在能访问预发 `DATABASE_URL` 的环境执行 **`npx prisma migrate deploy`**（Railway **Release Command** / 一次性 Shell / 本地 CLI 连预发库，择一；后续发版建议自动化）。  
9. **Networking**：为 API Service 生成公网域名；对外给前端的 base 为：  
   `https://<api-staging-host>/api/v1`  
   （与 `API_PREFIX` 一致。）

#### Vercel（预发 Web + Admin）

**推荐**：预发使用**独立 Project**（与生产分离，变量最清晰）。

对每个应用各建一个 Project（示例名 `css-web-staging`、`css-admin-staging`）：

| 项 | 值 |
|----|-----|
| Root Directory | `apps/web` 或 `apps/admin` |
| Framework | Vite（或自动检测） |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Git Production Branch | **`develop`**（使预发站点跟踪 develop） |
| Environment Variables | `VITE_API_BASE_URL` = `https://<api-staging-host>/api/v1` |

部署完成后，用浏览器 **Network** 确认请求指向预发 API；再在 Railway 将 **`CORS_ORIGINS`** 补全为实际 Vercel 预发域名（若首次部署后域名才生成）。

**备选**：同一 Project 用 **Preview** 绑定 feature 分支；需为 Preview 单独配置 `VITE_API_BASE_URL` 与 API 侧 CORS，运维成本更高，MVP 更推荐上表「独立 staging Project」。

### 13.5 阶段 C：日常预发发布（已搭好 staging 后）

1. PR 合并入 **`develop`**。  
2. Railway **api-staging** 与 Vercel **web-staging / admin-staging** 按各自「Production Branch = develop」自动构建部署。  
3. 若本次合并包含**新 migration**：确认发布流程中已对**预发库**执行 **`prisma migrate deploy`** 且成功。  
4. 执行第 9.1 节预发检查清单与冒烟（创建工单、查询工单、管理端改状态等）。

### 13.6 阶段 D：首次搭建生产（production）

1. 新建 Railway **Project**（或独立 Service 组），**生产** PostgreSQL + **api-prod**，Root **`apps/api`**，Git **Production Branch** = **`main`**。  
2. Variables 与预发同结构，但 **`DATABASE_URL`**、**`CORS_ORIGINS`**（仅生产 Web/Admin 域名）、**`JWT_SECRET`** 等均为**生产专用**，与预发不同。  
3. 首次上线前对**生产库**执行 **`prisma migrate deploy`**（与预发相同手段，务必确认连接的是生产库）。  
4. Vercel：`web-prod`、`admin-prod`，Root 同上，**Production Branch** = **`main`**，`VITE_API_BASE_URL` = `https://<api-prod-host>/api/v1`。  
5. 可选：在 Vercel **Domains** 绑定正式域名；将 **`CORS_ORIGINS`** 更新为正式域名的 Origin。

### 13.7 阶段 E：日常上线（已搭好 production 后）

1. 开 **PR：`develop` → `main`**，评审通过并合并。  
2. 确认 **Railway api-prod** 与 **Vercel web-prod / admin-prod** 均完成新部署。  
3. 若有新 migration：确认已对**生产库**执行 **`migrate deploy`** 且成功。  
4. 执行第 9.2、9.3 节清单。

### 13.8 各阶段「要做什么」一览

| 阶段 | Git | Railway | Vercel | 数据库 |
|------|-----|---------|--------|--------|
| 本地开发 | `feat/*` | — | — | 本地 / Docker，仅 `migrate dev` 生成文件 |
| 预发 | 合并到 `develop` | `develop` 触发 api-staging 部署 | `develop` 触发 staging 前端 | 对**预发库** `migrate deploy` |
| 线上 | 合并到 `main` | `main` 触发 api-prod 部署 | `main` 触发 prod 前端 | 对**生产库** `migrate deploy` |

### 13.9 易漏项（发布前快速核对）

- [ ] 预发前端的 `VITE_API_BASE_URL` 指向 **预发** API；生产前端指向 **生产** API。  
- [ ] 预发 API 的 `CORS_ORIGINS` **仅**预发前端；生产 API **仅**生产前端。  
- [ ] 迁移：先在 **staging** 验证，再在 **production** 执行；禁止在生产使用 `prisma migrate dev`。  
- [ ] 合并 `main` 后确认 Vercel **Production** 与 Railway **生产 Service** 均为最新成功部署。

---

## 14. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-10 | 初版：环境隔离、Vercel + Railway、Prisma、CORS、清单与回滚 |
| 1.1 | 2026-04-10 | 增加第 13 节「端到端操作手册」：分支、Railway/Vercel 逐步配置、日常预发与上线 |

---

## 15. 相关文档

- 技术架构：`docs/architecture/tech-architecture-react-antd-nestjs.md`  
- 仓库结构：`docs/architecture/project-structure.md`  
- 数据库设计：`docs/database/mvp-database-design.md`  
- PRD：`docs/requirements/mvp-prd.md`  
