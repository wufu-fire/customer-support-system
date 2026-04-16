# 安全防护与白帽测试技术方案

> 适用于本仓库当前形态：`apps/web`、`apps/admin`（Vercel）+ `apps/api`（Railway）+ PostgreSQL + Redis + MinIO。  
> 目标是建立“**先防护加固，再白帽验证，再持续回归**”的安全闭环。

## 1. 文档目的与适用范围

| 读者 | 用途 |
|------|------|
| 开发 / 测试 | 明确安全基线、白帽测试边界与执行方法 |
| 运维 / 负责人 | 落地边缘防护、发布门禁、事件响应 |
| 评审 / 审计 | 验证项目是否具备可持续安全能力 |

**适用范围**：本仓库应用与其关联基础设施（Vercel、Railway、数据库、对象存储、CI/CD）。  
**不含**：第三方服务法务条款、未授权资产测试。

---

## 2. 安全目标与威胁模型

### 2.1 保护目标

- 保护工单与用户信息，避免未授权读取与泄露。
- 防止管理后台账户被爆破、绕过或劫持。
- 防止 API 被恶意扫描、撞库、限流绕过与业务滥用。
- 防止上传链路成为恶意文件投递入口。
- 防止供应链漏洞与密钥泄露进入生产。

### 2.2 主要攻击面

| 层 | 攻击面 | 典型风险 |
|----|--------|----------|
| 边缘入口 | 域名、TLS、WAF、DNS | DDoS、恶意扫描、Bot、暴力尝试 |
| 前端 | `web` / `admin` 页面与请求 | XSS、点击劫持、敏感信息暴露 |
| API | `apps/api` 各类 REST 接口 | 注入、越权、枚举、鉴权绕过 |
| 数据与存储 | PostgreSQL、MinIO/S3 | 数据泄露、桶权限错误、备份缺失 |
| 交付链路 | CI/CD、依赖、镜像 | 供应链漏洞、秘密泄露、配置漂移 |

### 2.3 安全设计原则

- 最小暴露面：仅暴露必要端口、路径、域名。
- 默认拒绝：来源、权限、数据访问均按白名单策略。
- 分层防护：边缘、应用、数据、流程多层协同。
- 可观测与可追溯：日志、告警、审计链路可还原。
- 持续验证：每次发布前后均执行安全检查与回归。

---

## 3. 整体防护方案（分层落地）

## 3.1 边缘与网络层（建议优先 Cloudflare）

### Cloudflare 推荐能力（商业）

| 能力 | 目标 | 建议策略 |
|------|------|----------|
| WAF 托管规则 + OWASP | 拦截常见 Web 攻击 | 全站启用，先告警后拦截 |
| Rate Limiting Rules | 防爆破/防滥用 | 对登录、工单查询、上传接口单独限速 |
| Bot 管理（含 Super Bot Fight） | 减少自动化攻击流量 | 对高风险路径启用挑战 |
| DDoS 防护 | 吸收大流量攻击 | 保持默认开启并监控触发 |
| Zero Trust Access | 保护 `admin` 管理入口 | 限制来源身份与访问策略 |
| TLS/HSTS | 传输安全 | 强制 HTTPS，启用 HSTS |

### 边缘防护落地关键项（必须）

- 源站收敛：仅允许 Cloudflare 回源访问 API，避免绕过 WAF 直连源站。
- 关闭或隐藏源站公网直连入口（如临时域名、默认域名）并定期巡检。
- 管理后台入口叠加 Zero Trust + MFA，避免仅依赖账号密码。
- 对高风险路径（登录、工单查询、上传）设置独立限流与挑战策略。

### 开源/替代能力（按需）

- Nginx + ModSecurity（OWASP CRS）作为自建 WAF 方案。
- Fail2ban + Nginx 日志规则用于基础爆破拦截。
- Caddy/Nginx 做 TLS 强化与安全头基础治理。

## 3.2 应用层（NestJS / React）

- 全局输入校验：DTO + `class-validator`，拒绝未知字段与非法类型。
- 鉴权与授权：后台使用短时 JWT + 刷新机制；关键接口做 RBAC。
- 限流策略：登录、工单查询、上传接口使用更严格阈值。
- 错误处理：统一错误响应，不返回堆栈与内部细节给前端。
- 安全头：启用 `helmet`，包含 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、CSP。
- CORS 白名单：按环境区分，仅允许对应 `web/admin` 域名。
- 前端安全：禁止在前端存储服务端密钥；避免不受控 `dangerouslySetInnerHTML`。

### 鉴权与 CSRF 条件分支

- 若采用 `Session + HttpOnly Cookie`：必须启用 CSRF Token、防重放机制与 SameSite 策略。
- 若采用 `JWT`：明确 Access/Refresh 过期策略、刷新令牌轮换与失效机制（如黑名单/版本号）。
- 无论采用何种鉴权方式，关键写操作均需做权限二次校验（RBAC + 资源级校验）。

## 3.3 数据层与存储层

- 数据库账号最小权限：应用账户只拥有必要读写权限。
- 敏感数据策略：邮箱、手机号按业务需求脱敏展示与存储保护。
- 备份策略：每日备份 + 周期演练恢复，验证 RTO/RPO。
- 对象存储：默认私有桶 + 预签名 URL，禁止公开列目录。
- 上传校验：大小、后缀、MIME 双重校验，上传后异步恶意文件扫描。

## 3.4 交付与供应链层（CI/CD）

- 密钥扫描：提交与 CI 均执行，阻断泄露（如 Gitleaks）。
- 依赖扫描：SCA 扫描并设置“高危阻断发布”门禁。
- 代码扫描：SAST 进入 PR 必检流程。
- 容器与 IaC 扫描：对部署配置与镜像持续扫描。
- 发布门禁：安全检查失败不得进入 `main` 生产发布。

---

## 4. 工具选型建议（开源 + 商业）

## 4.1 推荐最小组合（MVP 可落地）

- 边缘：Cloudflare（WAF + Rate Limit + Bot + DDoS）。
- SAST：Semgrep CE（开源）。
- SCA：OSV-Scanner + `npm audit`（开源）。
- DAST：OWASP ZAP（开源）。
- 秘密扫描：Gitleaks（开源）。
- 容器/IaC：Trivy + Checkov（开源）。

## 4.2 进阶组合（预算允许）

- SAST/SCA：Snyk 平台（Code + Open Source + Container）。
- DAST：Burp Suite Pro 或 Enterprise。
- CNAPP/云安全：Wiz 或 Prisma Cloud。
- SIEM：Datadog Security 或 Elastic Security（商业版）。

## 4.3 工具能力矩阵

| 领域 | 开源候选 | 商业候选 |
|------|----------|----------|
| SAST | Semgrep、CodeQL | Snyk Code、Checkmarx |
| SCA | OSV-Scanner、Dependency-Check | Snyk OSS、Mend |
| DAST | OWASP ZAP、Nuclei | Burp Suite、Invicti |
| Secrets | Gitleaks、TruffleHog | GitHub Advanced Security |
| 容器/IaC | Trivy、Checkov | Wiz、Prisma Cloud |
| 边缘防护 | ModSecurity + CRS | Cloudflare、AWS WAF |

---

## 5. 白帽测试技术方案（分阶段）

## 5.1 测试前置（必须）

- 获得书面授权：测试目标、时间窗口、联系人、禁测项。
- 明确资产边界：域名、API 路径、后台地址、测试账号。
- 明确数据策略：只用测试数据，不对生产真实数据做破坏性操作。
- 约定响应流程：发现高危后 1 小时内通知与止血机制。

### 授权模板最小字段（建议固化）

- 目标资产：域名、IP、路径范围、是否包含第三方依赖。
- 时间窗口：开始/结束时间、允许的高并发时段。
- 工具白名单：可用扫描器、代理工具、脚本框架。
- 禁止动作：数据破坏、社工、生产压测、越权访问第三方系统。
- 事件响应：应急联系人、升级路径、紧急停止条件。

## 5.2 阶段划分与产出

| 阶段 | 目标 | 产出 |
|------|------|------|
| 阶段 A：威胁建模 | 明确风险场景与优先级 | 风险清单与测试用例池 |
| 阶段 B：自动化扫描 | 快速发现通用问题 | 初始漏洞清单（含证据） |
| 阶段 C：人工渗透验证 | 发现业务逻辑与越权问题 | 深度漏洞报告与复现步骤 |
| 阶段 D：修复复测 | 验证修复有效并防回归 | 复测报告与关闭证明 |

## 5.3 白帽测试重点（结合本项目）

### 认证与会话

- 登录失败策略、弱口令/爆破防护是否有效。
- JWT 过期、注销、刷新流程是否可绕过。
- 管理后台接口是否存在未授权访问路径。

### 业务逻辑与越权

- 工单查询是否可被枚举（工单号+邮箱组合攻击）。
- 后台工单接口是否存在 IDOR/BOLA。
- 状态流转接口是否可由低权限角色执行高权限动作。

### 输入与上传

- SQL 注入、命令注入、模板注入、参数污染。
- 文件上传绕过（双扩展、伪 MIME、恶意 SVG、超大文件）。
- 存储桶对象是否可被未授权访问或目录遍历。

### 前端与浏览器安全

- 反射型/存储型/DOM 型 XSS。
- CSP、X-Frame-Options、Cookie 安全属性是否生效。
- 敏感信息是否暴露在前端构建产物、错误信息、日志中。

### 基础设施与配置

- CORS 是否最小化配置，是否可被任意源滥用。
- TLS 配置是否存在弱协议/弱加密套件。
- 对外暴露端口与管理面是否符合最小暴露原则。

---

## 6. 测试执行方法（建议）

## 6.1 自动化执行顺序

1. 资产探测（授权范围内）  
2. 未认证 DAST 扫描（公共页面/API）  
3. 已认证 DAST 扫描（admin 测试账号）  
4. 业务流 DAST 扫描（提交工单 → 查询工单 → 后台状态流转）  
5. SAST/SCA/Secrets 扫描（代码与依赖）  
6. 汇总结果去重与定级

## 6.2 人工验证顺序

1. 鉴权与越权（后台接口优先）  
2. 工单查询与上传链路业务逻辑  
3. 前端安全与浏览器策略  
4. 配置与基础设施核查

## 6.3 漏洞分级建议

- 严重（Critical）：可直接接管后台、批量泄露数据、远程执行。
- 高危（High）：可稳定越权读取/修改敏感业务数据。
- 中危（Medium）：需一定条件触发但影响明确。
- 低危（Low）：安全姿态问题或难利用风险。

---

## 7. 发布与回归安全门禁

每次合并到 `develop`/`main` 前，至少满足：

- [ ] SAST：`Critical=0`、`High=0`（未豁免）  
- [ ] SCA：`Critical=0`、`High=0`（未豁免）  
- [ ] Secrets：泄露项 `=0`  
- [ ] DAST：关键路径 `Critical=0`、`High=0`  
- [ ] CORS、CSP、Cookie 安全属性检查通过  
- [ ] 关键业务链路冒烟通过（提交工单、查询工单、后台改状态）

对 `Medium/Low` 风险的处理要求：

- 必须有风险接受单（责任人、补偿控制、到期日）。
- 到期未修复应自动升级严重级别并进入发布阻断评审。

生产发布后：

- [ ] 复核 Cloudflare WAF/Rate Limit/Bot 命中情况  
- [ ] 监控 API 4xx/5xx 与异常请求峰值  
- [ ] 对本次修复项执行定向复测  

---

## 8. 30 天实施路线图（建议）

| 周次 | 目标 | 关键动作 |
|------|------|----------|
| 第 1 周 | 防护基线建立 | Cloudflare 基础规则、API 安全头与限流、CORS 收敛 |
| 第 2 周 | 扫描体系接入 | CI 集成 SAST/SCA/Secrets/DAST baseline |
| 第 3 周 | 深度白帽测试 | 人工渗透与业务逻辑测试，输出漏洞报告 |
| 第 4 周 | 修复与固化 | 完成高危修复、复测通过、沉淀回归清单 |

---

## 9. 事件响应与协作流程

- 漏洞接收：统一入口（工单或安全邮箱），记录时间与影响范围。
- 快速分流：按严重级别决定是否立即降级、限流或封禁路径。
- 修复闭环：修复提交、代码审查、复测通过、发布验证、文档归档。
- 复盘改进：每个高危问题都需要补充自动化检测或发布门禁。

---

## 10. 交付物清单（建议纳入团队流程）

- 《威胁建模与风险矩阵》
- 《白帽测试执行记录》
- 《漏洞报告（含 PoC 与修复建议）》
- 《复测报告与关闭清单》
- 《发布前安全检查清单（可自动化）》

### 漏洞复现证据最低标准

- 复现请求样本（可脱敏）：方法、路径、关键参数。
- 复现响应片段（可脱敏）：状态码、关键返回字段。
- 影响说明：数据范围、可利用前提、业务影响。
- 修复建议：最小修复路径与回归点。
- 复测结论：修复前后对比与验证截图/日志。

---

## 11. 相关文档

- `docs/architecture/tech-architecture-react-antd-nestjs.md`
- `docs/maintenance/release-environment-governance.md`
- `docs/architecture/project-structure.md`

---

## 12. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-16 | 初版：安全防护方案与白帽测试技术方案 |
| 1.1 | 2026-04-16 | 新增可直接执行的 CI 安全扫描脚本清单与使用说明 |
| 1.2 | 2026-04-16 | 补充回源收敛、认证态/业务流 DAST、CSRF 条件分支、量化门禁与证据标准 |

---

## 13. 可直接执行的 CI 安全扫描脚本清单与使用说明

## 13.1 脚本清单（已在根目录 `package.json` 定义）

| 脚本 | 作用 | 是否建议阻断流水线 |
|------|------|------------------|
| `npm run security:sca` | 依赖漏洞扫描（`npm audit`，高危阈值） | 是 |
| `npm run security:osv` | OSV 漏洞补充扫描（锁文件维度） | 初期否，后续可转是 |
| `npm run security:sast` | SAST 静态规则扫描（Semgrep） | 是 |
| `npm run security:secrets` | Secrets 泄露扫描（Gitleaks） | 是 |
| `npm run security:container` | 文件系统漏洞/密钥/配置扫描（Trivy） | 是 |
| `npm run security:dast:baseline` | DAST 基线扫描（ZAP，目标站点） | 初期否，后续可转是 |
| `npm run security:all` | 聚合执行（SCA + OSV + SAST + Secrets + Trivy） | 是 |

## 13.2 前置条件

- Node.js 与 npm 可用（与项目开发环境一致）。
- 执行 `npm ci` 或 `npm install` 后再运行脚本。
- `security:dast:baseline` 依赖 Docker 环境。
- 使用 DAST 前，必须确保目标站点在白帽授权范围内。

## 13.3 快速执行方式

### 本地一次性全量扫描

```bash
npm run security:all
```

### 单独执行 DAST 基线扫描（建议对 staging）

```bash
ZAP_TARGET_URL="https://your-staging-domain.example.com" npm run security:dast:baseline
```

执行后会在当前目录生成 `zap-report.html` 报告。

## 13.4 CI 建议执行顺序

1. `npm run security:sca`
2. `npm run security:osv`
3. `npm run security:sast`
4. `npm run security:secrets`
5. `npm run security:container`
6. `npm run security:dast:baseline`（建议先在 nightly/staging 流水线）

## 13.5 推荐门禁策略（分阶段）

### 第 1 阶段（快速落地）

- 阻断：`sca`、`sast`、`secrets`、`container`
- 告警：`osv`、`dast:baseline`

### 第 2 阶段（稳态收敛）

- 在团队处理一定历史告警后，将 `osv` 与 `dast:baseline` 逐步升级为阻断规则。

## 13.6 常见问题

- `security:dast:baseline` 报错目标为空：请先设置 `ZAP_TARGET_URL`。
- DAST 误报较多：先告警不阻断，按业务真实风险做白名单与规则调优。
- 扫描耗时偏长：将 `dast:baseline` 放到 nightly 或预发发布后任务。
