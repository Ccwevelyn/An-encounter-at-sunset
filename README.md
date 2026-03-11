# 人际关系 · 真诚相遇

根据《人际关系网页构想》文档实现的恋爱/社交匹配网页，支持不同用户通过网址访问使用。

## 功能概览

- **入口动画**：黑白简笔画小人与夕阳文案，可跳过、可勾选「以后不再查看」
- **登录 / 注册**：邮箱须为 `@mpu.edu.mo`，昵称唯一，密码
- **个人信息补充**：多步问卷（性别、学院、专业、生日、MBTI、感情经历、恋爱目的、城市、月花销、长大的城市、想恋爱指数等），结束后担保弹窗与「请，绝对，真诚。」黑屏
- **两种匹配**：随机匹配（双方同时点过才可匹配）、缘分匹配（按目的/城市/花销/恋爱指数/经历/MBTI 等规则）
- **匹配结果**：查看对方档案，进入聊天
- **个人页面**：展示已填资料与个人介绍
- **作者的话**：文档中的两段话与致谢

## 本地运行

### 1. 安装依赖

在项目根目录执行（会同时安装根目录、前端、后端依赖）：

```bash
npm run install:all
```

若未配置根目录的 `install:all`，可分别执行：

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. 开发环境（前后端分开跑，便于调试）

- 终端 1 启动后端：`cd server && npm run dev`（默认 http://localhost:3000）
- 终端 2 启动前端：`cd client && npm run dev`（默认 http://localhost:5173）

浏览器访问：**http://localhost:5173**。前端会通过 Vite 代理把 `/api` 请求转发到后端。

### 3. 生产模式（单端口，模拟部署）

先构建前端，再用后端托管静态资源：

```bash
cd client && npm run build
cd ../server && npm run start
```

设置环境变量 `NODE_ENV=production` 时，后端会托管 `client/dist`。访问 **http://localhost:3000** 即可。

## 通过网址访问（部署到公网）

要让「不同用户通过网址点击」使用，需要把项目部署到一台有公网 IP 或域名的服务器上。

### 方式一：单机部署（VPS / 云服务器）

1. 将整个项目上传到服务器（如用 Git 或 FTP）。
2. 在服务器上安装 Node.js（建议 18+），然后执行：
   ```bash
   npm run install:all
   cd client && npm run build
   cd ../server && npm run start
   ```
3. 设置环境变量（可选）：
   - `PORT=80`（或你想要的端口）
   - `NODE_ENV=production`
   - `JWT_SECRET=你的随机密钥`（建议设置，提高安全性）
4. 用 **pm2** 或 **systemd** 让 `npm run start` 常驻运行，并配置 Nginx 反向代理到该端口（可选，便于绑定域名和 HTTPS）。

这样，别人通过 `http://你的服务器IP:3000` 或 `https://你的域名` 即可访问。

### 方式二：拆分前后端部署

- **前端**：构建后部署到 Vercel / Netlify / 任意静态托管，并配置 API 请求地址为你的后端地址（例如 `https://api.你的域名.com`）。
- **后端**：部署到 Railway / Render / 你的 VPS，开启 CORS 允许前端域名，并设置 `JWT_SECRET` 等环境变量。

前端中的 API 基础地址需要与后端一致（开发时用 Vite 代理，生产时需在构建时或运行时指向真实后端 URL）。

### 数据库

当前使用 **SQLite**（`server/data.db`），数据保存在服务器本地。部署时请保证 `server` 目录可写，以便创建/写入 `data.db`。若以后要支持更大并发，可更换为 PostgreSQL/MySQL，并修改 `server/db.js` 与相关 SQL。

## 技术栈

- **前端**：React 18、React Router、Vite
- **后端**：Node.js、Express、better-sqlite3、bcryptjs、jsonwebtoken
- **部署**：Node 单进程即可；可加 Nginx + pm2 做生产部署

## 注意事项

- 注册邮箱限制为 `@mpu.edu.mo`，与文档一致。
- MBTI 可选「不知道」；文档提到的「接入特定 API」的 MBTI 测试题可在后续版本中接入，当前为选择已有类型或「不知道」。
- 随机匹配的「同时」采用 5 分钟内都点过随机匹配的窗口逻辑；如需调整时间窗口，可修改 `server/routes/match.js` 中的 `RANDOM_WINDOW_MS`。

如有问题或想扩展功能，可以继续问我。
