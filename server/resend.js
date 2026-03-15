/**
 * 使用 Resend 发送邮件。需配置环境变量：
 * - RESEND_API_KEY：Resend API Key（在 https://resend.com/api-keys 创建）
 * - RESEND_FROM：发件人，如 "日落相遇 <onboarding@resend.dev>"（未验证域名时可用 onboarding@resend.dev 测试）
 */
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || '在日落下相遇 <onboarding@resend.dev>';

let client = null;
if (apiKey) {
  client = new Resend(apiKey);
}

/**
 * 发送登录验证码邮件
 * @param {string} to - 收件邮箱
 * @param {string} code - 4 位验证码
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendLoginCodeEmail(to, code) {
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Resend 未配置] 登录验证码（开发用）:', { to, code });
      return { ok: true };
    }
    return { ok: false, error: '邮件服务未配置' };
  }
  const { data, error } = await client.emails.send({
    from,
    to: [to],
    subject: '你的登录验证码',
    html: `
      <p>你好，</p>
      <p>你的登录验证码是：<strong>${code}</strong></p>
      <p>有效期 5 分钟，请勿泄露给他人。</p>
      <p>如非本人操作，请忽略此邮件。</p>
    `,
  });
  if (error) {
    console.error('[Resend] 发送失败:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * 发送注册验证码邮件
 */
export async function sendRegisterCodeEmail(to, code) {
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Resend 未配置] 注册验证码（开发用）:', { to, code });
      return { ok: true };
    }
    return { ok: false, error: '邮件服务未配置' };
  }
  const { data, error } = await client.emails.send({
    from,
    to: [to],
    subject: '你的注册验证码',
    html: `
      <p>你好，</p>
      <p>你的注册验证码是：<strong>${code}</strong></p>
      <p>有效期 5 分钟，请勿泄露给他人。</p>
      <p>如非本人操作，请忽略此邮件。</p>
    `,
  });
  if (error) {
    console.error('[Resend] 发送失败:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
