# 版本 2.0 更新说明

## 已实现

1. **SQL 注入防护**  
   - 所有查询均使用参数化（`?` / 参数数组），`major`、`college` 等用户输入从不拼接进 SQL。profile 等接口已确认安全。

2. **登录后正确显示当前用户**  
   - 新用户登录后立即用登录接口返回的 `userId/email/nickname` 更新前端 state，再按需拉取 profile，避免仍显示上一用户的账号。

3. **Test 机器人**  
   - 聊天列表首位固定为「Test」；与 Test 的对话由服务端内存存储并生成回复（简短中文、偏你语言习惯）。  
   - 返回链接：与 Test 聊天时返回「聊天」列表。

4. **聊天列表去重**  
   - 同一对象只展示一条（按 partner 去重），避免「a 匹配 b、b 匹配 a」或同一对多模式导致重复。

5. **灵魂共鸣**  
   - 新增 3 道主观题（可扩展为 3–5 题），用户文字回答存入 `soul_answers`。  
   - 首页增加「灵魂共鸣」卡片与「去填主观题」入口（`/soul`）。  
   - 匹配接口：`POST /api/match/soul`，当前为在已填主观题且符合性别偏好的用户中随机一人；后续可接入 AI 分析答案做相似度匹配。

6. **使用 PostgreSQL 时隐藏自带管理页**  
   - 当存在环境变量 `DATABASE_URL` 时，不再挂载 `/admin` 及 `/api/admin`（使用 Render 等自带的数据库管理界面即可）。

7. **邮箱认证（仅数据结构与占位）**  
   - 已建表 `email_verifications`（email, token, expires_at）。  
   - 完整流程（发邮件、验证链接、注册时校验）需配置发信（如 SMTP、Resend），并在 `auth` 中增加：  
     - `POST /api/auth/send-verification`（发验证邮件）  
     - `GET /api/auth/verify-email?token=xxx`（验证并返回一次性 completion token）  
     - 注册接口改为：先验证邮箱再允许设置昵称/密码。  
   - 当前注册仍为「邮箱 + 昵称 + 密码」，未强制邮箱验证；要启用需自行接好发信与上述接口。

8. **验证码登录（Resend）**  
   - 已建表 `login_codes`（email, code, expires_at）。  
   - `POST /api/auth/send-login-code`：body `{ email }`，仅限已注册的 @mpu.edu.mo 邮箱，发送 4 位验证码到邮箱，5 分钟有效。  
   - `POST /api/auth/login-with-code`：body `{ email, code }`，验证通过后返回 token，与密码登录返回格式一致。  
   - **环境变量**：`RESEND_API_KEY`（必填，[Resend API Keys](https://resend.com/api-keys) 创建）、`RESEND_FROM`（选填，默认 `日落相遇 <onboarding@resend.dev>`；正式环境建议验证域名后改为自己的发件地址）。

---

## 未完成（需你本地/部署完成的）

### 换用 PostgreSQL 持久化数据库

- 当前服务仍使用 **SQLite**（`server/data.db`）。  
- 要改为 **PostgreSQL**（例如 Render 提供的库）：  
  1. 在 Render 创建 PostgreSQL 实例，拿到 `DATABASE_URL`。  
  2. 在项目中安装 `pg`，并新增一层「数据库抽象」：用 `pool.query(sql, [params])` 替代 `db.prepare().get/run/all`，SQL 使用 `$1, $2` 占位。  
  3. 在 PostgreSQL 中执行建表（users, profiles, matches, messages, soul_questions, soul_answers, email_verifications），类型改为 PG 语法（如 `SERIAL`、`TEXT`、`timestamp` 等）。  
  4. 所有使用 `db` 的路由改为 `async/await` 调用该抽象层。  
- 完成后，设置 `DATABASE_URL` 即会使用 PostgreSQL，且按当前逻辑会**自动不再提供** `/admin` 管理页。

### 邮箱认证完整流程（注册前验证链接）

- 表已就绪，需你：  
  - 配置发信（如 `RESEND_API_KEY` 或 SMTP）；  
  - 实现发验证邮件、验证链接、以及注册时校验 token 的逻辑（见上文接口说明）。  
- **验证码登录**已实现：配置 `RESEND_API_KEY` 后即可使用「发送验证码 → 验证码登录」。

### DeepSeek 集成（Test 机器人 + 可选灵魂匹配）

- **环境变量**：在 Render（或本机）中设置 **`DEEPSEEK_API_KEY`**，值为你的 DeepSeek API Key。**切勿把 Key 写在代码里或提交到 Git。**
- **Test 机器人**：设置 `DEEPSEEK_API_KEY` 后，与 Test 的对话会由 DeepSeek 生成回复（简短、中文、口语化）；未设置时仍用内置规则回复。
- **灵魂共鸣**：当前仍为随机匹配；若要按「想法更接近」用 AI 排序，可在 `POST /api/match/soul` 中读取双方 `soul_answers`，调用 `callDeepSeek` 做相似度/打分后选人（需自写 prompt）。

---

## 小结

- **已上线**：防注入、登录即当前用户、Test 机器人、聊天去重、灵魂共鸣（主观题 + 随机匹配）、PostgreSQL 时隐藏管理页、邮箱验证表与占位。  
- **需你后续**：PostgreSQL 迁移与建表、邮箱发信与验证流程、灵魂共鸣 AI 分析（可选）。
