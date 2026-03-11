# 快捷部署指南：用网址打开页面

项目已支持「后端 + 前端」一起部署，一次部署即可用网址访问。

---

## 方式一：Railway（推荐，约 5 分钟）

1. **代码推到 GitHub**
   - 在项目根目录执行：
   ```bash
   git init
   git add .
   git commit -m "deploy"
   ```
   - 在 [GitHub](https://github.com/new) 新建仓库，按页面提示把本地仓库 push 上去。

2. **用 Railway 部署**
   - 打开 [railway.app](https://railway.app)，用 GitHub 登录。
   - 点击 **New Project** → **Deploy from GitHub repo**，选你的仓库。
   - 在项目里点 **Variables**，添加：
     - `NODE_ENV` = `production`（可选）
   - 点 **Settings** → **Build**：
     - **Build Command**：`npm run install:all && npm run build`
     - **Start Command**：`npm run start`
     - **Root Directory**：留空（仓库根目录）
   - 保存后会自动构建并部署。部署完成后在 **Settings** → **Networking** 里点 **Generate Domain**，会得到一个 `xxx.railway.app` 的网址，用浏览器打开即可。

3. **数据持久化（SQLite）**
   - Railway 免费版会提供临时磁盘，重启/重新部署后 `data.db` 可能被清空。若需要长期保留数据，可在 Railway 里为服务挂载 **Volume**（在服务 → **Volumes** 里创建并挂到 `server` 目录），把 `server/data.db` 放在挂载路径下。

---

## 方式二：Render（免费，适合体验）

1. 代码同样先推到 GitHub。

2. 打开 [render.com](https://render.com)，用 GitHub 登录 → **New** → **Web Service**，选你的仓库。

3. 配置：
   - **Build Command**：`npm run install:all && npm run build`
   - **Start Command**：`npm run start`
   - **Instance Type**：选 Free（可选）

4. 创建后会自动部署。在 **Settings** → **Environment** 可加 `NODE_ENV=production`（可选）。  
   部署完成后会得到一个 `xxx.onrender.com` 的网址。

**注意**：Render 免费实例休眠后，磁盘会清空，SQLite 数据会丢失；仅适合演示，不适合长期存数据。

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
| 重新部署后数据没了 | 使用 Railway Volume 或自有服务器持久化 `server/data.db`；Render 免费版不保证持久化。 |

按上面任选一种方式部署后，即可用生成的网址在浏览器中打开页面。
