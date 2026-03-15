import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import db from './db.js'; // 预加载 DB（PG 时跑迁移后再监听）
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import matchRoutes from './routes/match.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);

// 使用 PostgreSQL（如 Render）时通常自带数据库管理界面，不再提供 /admin
if (!process.env.DATABASE_URL) {
  app.use('/api/admin', adminRoutes);
  app.get('/admin', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(readFileSync(join(__dirname, 'admin.html'), 'utf-8'));
  });
}

// 若已构建前端则托管静态文件（便于单机部署）
const distPath = join(__dirname, '../client/dist');
const { existsSync } = await import('fs');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // 禁止缓存 index.html，确保部署后用户拿到最新前端
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] 未配置 RESEND_API_KEY，登录/注册验证码将不会真实发送（开发环境会打印到控制台）');
  } else {
    console.log('[Resend] 已配置，验证码邮件将通过 Resend 发送');
  }
});
