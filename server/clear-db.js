/**
 * 清空数据库所有数据（保留表结构），自增 ID 从 1 重新开始。
 * 用法：先停止后端服务，再在项目根目录执行：node server/clear-db.js
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data.db');
const db = new Database(dbPath);

// 按外键依赖顺序清空（先子表后主表）
db.exec(`
  DELETE FROM messages;
  DELETE FROM matches;
  DELETE FROM profiles;
  DELETE FROM users;
`);

// 重置自增序列
db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('users', 'profiles', 'matches', 'messages');`);

// 压缩数据库文件，彻底释放空间
db.exec(`VACUUM;`);

console.log('数据库已清空，自增 ID 已重置（新用户将从 1 开始）。');
db.close();
