/**
 * DeepSeek API 调用（OpenAI 兼容格式）
 * 使用前在环境变量中设置 DEEPSEEK_API_KEY，切勿写入代码或提交到仓库。
 */
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

export async function callDeepSeek(messages, options = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  const maxTokens = options.max_tokens ?? 200;
  try {
    const res = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DeepSeek]', res.status, err);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error('[DeepSeek]', e.message);
    return null;
  }
}
