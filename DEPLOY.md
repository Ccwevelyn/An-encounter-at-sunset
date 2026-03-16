# Render 部署

1. **代码在 GitHub**  
   在 [render.com](https://render.com) 用 GitHub 登录 → **New** → **Web Service**，选本仓库。

2. **配置**
   - **Build Command**：`npm run install:all && npm run build`
   - **Start Command**：`npm run start`
   - **Instance Type**：Free  
   或用 **Blueprint** 连接仓库，根目录 `render.yaml` 已写好，无需再填。

3. 部署完成后用 `xxx.onrender.com` 打开即可。

4. **（可选）环境变量**
   - `ADMIN_SECRET`：设一串密文，访问 `https://你的服务.onrender.com/admin?secret=你设的ADMIN_SECRET` 可查看/编辑数据。
   - `DATABASE_URL`：接 [Neon](https://neon.tech) 或 [Supabase](https://supabase.com) 的 PostgreSQL 连接串，数据持久保存（免费实例重启会清空 SQLite）。
   - `DEEPSEEK_API_KEY`：需要 AI 聊天时再配。

5. **常见问题**
   - 白屏 / 404：确认 Build 含 `npm run build`，Start 为 `npm run start`。
   - 数据丢失：在 Environment 里填 `DATABASE_URL`（Neon/Supabase）即可持久。
