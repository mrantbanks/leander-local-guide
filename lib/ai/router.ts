import { pool } from '@/lib/db';

// Central AI routing. Each task is mapped (in the ai_config table, editable at /admin/ai) to an
// engine: 'gemini' (Google, live), 'claude' (Anthropic API, active when ANTHROPIC_API_KEY is set),
// or 'remote' (handed to the worker fleet — only valid for queue tasks: moderation, events).

export type Provider = 'gemini' | 'claude' | 'remote';
export type AiTask = 'moderation' | 'events' | 'happy_hour' | 'anthony_voice' | 'captions';

export const TASKS: { task: AiTask; label: string; desc: string; allow: Provider[]; def: Provider }[] = [
  { task: 'moderation', label: 'Review & tip moderation', desc: 'Decide if a user review/tip is genuine and on-topic. "Remote" hands it to the worker fleet (needs the worker client to poll /api/worker/moderation).', allow: ['remote', 'gemini', 'claude'], def: 'gemini' },
  { task: 'events', label: 'Events — discover & verify', desc: 'Find and confirm trivia / live music / etc. with a real day & time. The fleet already does this via /api/worker/events.', allow: ['remote', 'gemini', 'claude'], def: 'remote' },
  { task: 'happy_hour', label: 'Happy-hour scraper (weekly cron)', desc: 'Read each restaurant website and pull the happy hour. Good candidate for Claude.', allow: ['gemini', 'claude'], def: 'gemini' },
  { task: 'anthony_voice', label: "Anthony's AI voice (review composer)", desc: 'Draft reviews in the Bourdain voice. Gemini is fine here.', allow: ['gemini', 'claude'], def: 'gemini' },
  { task: 'captions', label: 'Photo captions (vision)', desc: 'Write a short caption from a photo. Vision task.', allow: ['gemini', 'claude'], def: 'gemini' },
];

const DEFAULTS: Record<string, Provider> = Object.fromEntries(TASKS.map((t) => [t.task, t.def]));

let cache: Record<string, Provider> | null = null;
let cacheAt = 0;
export async function getAiConfig(): Promise<Record<string, Provider>> {
  if (cache && Date.now() - cacheAt < 30_000) return cache;
  const map: Record<string, Provider> = { ...DEFAULTS };
  try {
    const { rows } = await pool.query('select task, provider from ai_config');
    for (const r of rows) map[r.task] = r.provider;
  } catch { /* table missing -> defaults */ }
  cache = map; cacheAt = Date.now();
  return map;
}
export async function getProvider(task: AiTask): Promise<Provider> {
  return (await getAiConfig())[task] || DEFAULTS[task];
}
export async function setProvider(task: string, provider: string): Promise<void> {
  await pool.query('insert into ai_config(task, provider, updated_at) values ($1,$2,now()) on conflict (task) do update set provider=$2, updated_at=now()', [task, provider]);
  cache = null;
}
export function claudeAvailable(): boolean { return !!process.env.ANTHROPIC_API_KEY; }

// --- engines ---
const GKEY = () => process.env.GEMINI_API_KEY || '';
const AKEY = () => process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

async function geminiJSON(parts: Part[], temperature: number): Promise<unknown> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GKEY()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature } }),
  });
  const j = await r.json();
  const t = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
  return JSON.parse(t);
}
async function claudeJSON(parts: Part[], temperature: number): Promise<unknown> {
  const content: unknown[] = parts.map((p) => p.inlineData
    ? { type: 'image', source: { type: 'base64', media_type: p.inlineData.mimeType, data: p.inlineData.data } }
    : { type: 'text', text: p.text || '' });
  content.push({ type: 'text', text: 'Respond with ONLY the JSON object, no prose and no markdown fences.' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': AKEY(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1024, temperature, messages: [{ role: 'user', content }] }),
  });
  const j = await r.json();
  const t = (j?.content?.find((c: { type: string; text?: string }) => c.type === 'text')?.text || '').replace(/^```json\s*|\s*```$/g, '');
  return JSON.parse(t);
}

// Run a JSON-returning task honoring the config. Inline callers can't use 'remote' -> falls back to
// gemini. 'claude' falls back to gemini if no key, so the site never breaks on a misconfig.
export async function runJSON(task: AiTask, prompt: string, opts?: { temperature?: number; image?: { mimeType: string; data: string } }): Promise<unknown> {
  const provider = await getProvider(task);
  const temperature = opts?.temperature ?? 0.2;
  const parts: Part[] = [];
  if (opts?.image) parts.push({ inlineData: opts.image });
  parts.push({ text: prompt });
  if (provider === 'claude' && AKEY()) {
    try { return await claudeJSON(parts, temperature); } catch { return geminiJSON(parts, temperature); }
  }
  return geminiJSON(parts, temperature);
}
