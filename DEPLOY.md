# 快捷部署指南：用网址打开页面

项目已支持「后端 + 前端」一起部署，一次部署即可用网址访问。

---

## 方式一：Render（免费，适合体验）

1. **代码推到 GitHub**
   - 在项目根目录执行：
   ```bash
   git init
   git add .
   git commit -m "deploy"
   ```
   - 在 [GitHub](https://github.com/new) 新建仓库，按页面提示把本地仓库 push 上去。

2. 打开 [render.com](https://render.com)，用 GitHub 登录 → **New** → **Web Service**，选你的仓库。

3. 配置（**必须这样配，聊天左右才会在线上正确**）：
   - **Build Command**：`npm run install:all && npm run build`
   - **Start Command**：`npm run start`
   - **Instance Type**：选 **Free**
   - 这样每次部署都会在 Render 上构建最新前端，你发的消息会稳定显示在右侧。
   - 若出现 `better-sqlite3` / `invalid ELF header`，请确认**未**把 `server/node_modules` 提交到仓库，让依赖在 Linux 上重新安装。
   - 也可在 Render 里用 **Blueprint** 连接本仓库，根目录的 `render.yaml` 已写好上述命令，无需再填。

4. 创建后会自动部署。部署完成会得到一个 `xxx.onrender.com` 的网址，用浏览器打开即可。

5. **（可选）数据库管理页**：在 Render 的 **Environment** 里添加环境变量 `ADMIN_SECRET`（设为你自己的一串密文）。部署后访问 `https://你的服务.onrender.com/admin?secret=你设的ADMIN_SECRET` 即可在浏览器中查看、编辑数据（users、profiles、matches、messages）。

6. **让数据不丢失（免费 PostgreSQL）**：  
   Render 免费实例磁盘不持久，用 SQLite 时重启/重新部署后数据会清空。只要接一个**免费云数据库**，数据就会持久保存，无需付费。

   **推荐：Neon（免费、免信用卡）**
   - 打开 [neon.tech](https://neon.tech)，用 GitHub 登录 → **New Project** → 起个名字 → 创建。
   - 在项目里点 **Connection string**，复制整串（形如 `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`）。
   - 在 Render 的 **Dashboard** → 你的 Web Service → **Environment** → **Add Environment Variable**：
     - Key：`DATABASE_URL`
     - Value：粘贴刚才复制的连接串。
   - 保存后 Render 会自动重新部署。部署完成后，数据会存在 Neon，**重启或再次部署都不会丢数据**。

   **备选**： [Supabase](https://supabase.com) 免费版也提供 PostgreSQL，在 Project Settings → Database 里可拿到连接串，同样把 `DATABASE_URL` 填到 Render 的 Environment 即可。

**注意**：免费实例一段时间不用会休眠，唤醒较慢；接上 Neon/Supabase 后数据在云端，不受影响。

**在 Render 上如何查看数据库**：
- **用本项目的 admin 页（推荐）**：在 Environment 里配置好 `ADMIN_SECRET` 后，访问 `https://你的服务.onrender.com/admin?secret=你设的ADMIN_SECRET`，即可在页面上查看、编辑 users、profiles、matches、messages 等表（无论 SQLite 还是 PostgreSQL 都支持）。
- **用 Neon 时**：在 [Neon Console](https://console.neon.tech) 进入你的项目 → **SQL Editor** 可直接查表、跑 SQL；或在本机用 DBeaver/TablePlus，用同一份 `DATABASE_URL` 连接串连接即可。

---

## 方式二：Railway（付费，试用后约 $5/月）

Railway 目前**没有长期免费套餐**，只有约 30 天试用（含 $5 额度），之后需付费（Hobby 约 $5/月）。

若你愿意付费或只用试用期：
- 打开 [railway.app](https://railway.app)，用 GitHub 登录 → **New Project** → **Deploy from GitHub repo**。
- **Build Command**：`npm run install:all && npm run build`
- **Start Command**：`npm run start`
- 在 **Networking** 里 **Generate Domain** 得到网址。需要长期保留 SQLite 数据可挂载 **Volume** 到 `server` 目录。

---

## 方式三：自己的服务器（VPS / 云主机）

有云服务器（阿里云、腾讯云、海外 VPS 等）时：

1. **安装 Node.js**（建议 18+）：
   ```bash
   # 示例：Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. **上传代码并构建、运行**：
   ```bash
   cd /path/to/你的项目
   npm run install:all
   npm run build
   PORT=80 npm run start
   ```
   若要用 80 端口，通常需 root 或配合 nginx 反向代理。

3. **用 PM2 保持常驻**（可选）：
   ```bash
   npm install -g pm2
   npm run build
   cd server && pm2 start index.js --name "app" -- --port 3000
   pm2 save && pm2 startup
   ```
   然后通过服务器公网 IP 或绑定的域名访问，例如 `http://你的域名或IP:3000`。

---

## 部署前自测（本地模拟线上）

在本地先跑一遍「构建 + 只开后端」，确认用网址能打开页面：

```bash
 npm run build
 npm run start
```

浏览器打开 `http://localhost:3000`，应能看到页面且接口正常（登录、匹配等）。

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 打开网址白屏 / 404 | 确认 **Build Command** 包含 `npm run build`，且 **Start Command** 是 `npm run start`（会先 build 再起服务）。 |
| 接口 404 / 跨域 | 前端已用相对路径 `/api`，同一域名下无需改配置。 |
| 重新部署后数据没了 | 按上文第 6 步接 **Neon 免费 PostgreSQL**，把 `DATABASE_URL` 填到 Render 的 Environment，数据即持久保存。 |

按上面任选一种方式部署后，即可用生成的网址在浏览器中打开页面。
