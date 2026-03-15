const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getHeaders(useAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const t = getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
  }
  return h;
}

export async function register(email, nickname, password) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, nickname, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '注册失败');
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '登录失败');
  return data;
}

export async function sendLoginCode(email) {
  const res = await fetch(`${API}/auth/send-login-code`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '发送失败');
  return data;
}

export async function loginWithCode(email, code) {
  const res = await fetch(`${API}/auth/login-with-code`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email: email.trim().toLowerCase(), code: String(code).trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '登录失败');
  return data;
}

export async function getProfile() {
  const res = await fetch(`${API}/profile`, { headers: getHeaders() });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '获取资料失败');
  return data;
}

export async function getOtherProfile(userId) {
  const res = await fetch(`${API}/profile/${userId}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '获取失败');
  return data;
}

export async function saveProfile(profile) {
  const res = await fetch(`${API}/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ profile }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '保存失败');
  return data;
}

export async function matchRandom() {
  const res = await fetch(`${API}/match/random/join`, { method: 'POST', headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export async function matchFate() {
  const res = await fetch(`${API}/match/fate`, { method: 'POST', headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export async function getSoulQuestions() {
  const res = await fetch(`${API}/match/soul/questions`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '获取失败');
  return data;
}

export async function submitSoulAnswers(answers) {
  const res = await fetch(`${API}/match/soul/answers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ answers }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '提交失败');
  return data;
}

export async function matchSoul() {
  const res = await fetch(`${API}/match/soul`, { method: 'POST', headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export async function getMatchList() {
  const res = await fetch(`${API}/match/list`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '获取失败');
  return data;
}

export async function getMessages(partnerId) {
  const res = await fetch(`${API}/chat/${partnerId}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '获取失败');
  return data;
}

export async function sendMessage(partnerId, content) {
  const res = await fetch(`${API}/chat/${partnerId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '发送失败');
  return data;
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function isLoggedIn() {
  return !!getToken();
}
