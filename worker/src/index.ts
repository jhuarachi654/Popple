export interface Env {
  POPPLE_DATA: KVNamespace;
  AUTH_SECRET: string;
  OPENAI_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ── JWT helpers (HS256 via Web Crypto) ────────────────────────────────────────

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 })));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), new TextEncoder().encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password hashing (PBKDF2) ─────────────────────────────────────────────────

async function hashPassword(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: s, iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return { hash: b64url(bits), salt: b64url(s) };
}

async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, b64urlDecode(storedSalt));
  return hash === storedHash;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(auth.slice(7), env.AUTH_SECRET);
  return (payload?.sub as string) ?? null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ── Auth routes (no token required) ──────────────────────────────────────

    if (path === '/auth/signup' && request.method === 'POST') {
      const { email, password } = await request.json() as { email: string; password: string };
      if (!email || !password) return json({ error: 'Email and password required' }, 400);

      const existing = await env.POPPLE_DATA.get(`user:email:${email.toLowerCase()}`);
      if (existing) return json({ error: 'An account with this email already exists.' }, 409);

      const { hash, salt } = await hashPassword(password);
      const userId = crypto.randomUUID();
      const user = { id: userId, email: email.toLowerCase(), name: email.split('@')[0], createdAt: new Date().toISOString() };

      await env.POPPLE_DATA.put(`user:${userId}`, JSON.stringify({ ...user, hash, salt }));
      await env.POPPLE_DATA.put(`user:email:${email.toLowerCase()}`, userId);

      const token = await signJwt({ sub: userId, email: user.email }, env.AUTH_SECRET);
      return json({ token, user });
    }

    if (path === '/auth/signin' && request.method === 'POST') {
      const { email, password } = await request.json() as { email: string; password: string };
      if (!email || !password) return json({ error: 'Email and password required' }, 400);

      const userId = await env.POPPLE_DATA.get(`user:email:${email.toLowerCase()}`);
      if (!userId) return json({ error: 'Email or password is incorrect.' }, 401);

      const userData = await env.POPPLE_DATA.get(`user:${userId}`);
      if (!userData) return json({ error: 'Email or password is incorrect.' }, 401);

      const stored = JSON.parse(userData) as { id: string; email: string; name: string; hash: string; salt: string };
      const valid = await verifyPassword(password, stored.hash, stored.salt);
      if (!valid) return json({ error: 'Email or password is incorrect.' }, 401);

      const token = await signJwt({ sub: stored.id, email: stored.email }, env.AUTH_SECRET);
      const user = { id: stored.id, email: stored.email, name: stored.name };
      return json({ token, user });
    }

    if (path === '/auth/me' && request.method === 'GET') {
      const userId = await getUserId(request, env);
      if (!userId) return json({ error: 'Unauthorized' }, 401);
      const userData = await env.POPPLE_DATA.get(`user:${userId}`);
      if (!userData) return json({ error: 'User not found' }, 404);
      const { id, email, name } = JSON.parse(userData);
      return json({ user: { id, email, name } });
    }

    if (path === '/auth/update-password' && request.method === 'POST') {
      const userId = await getUserId(request, env);
      if (!userId) return json({ error: 'Unauthorized' }, 401);
      const { password } = await request.json() as { password: string };
      if (!password || password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
      const userData = await env.POPPLE_DATA.get(`user:${userId}`);
      if (!userData) return json({ error: 'User not found' }, 404);
      const stored = JSON.parse(userData);
      const { hash, salt } = await hashPassword(password);
      await env.POPPLE_DATA.put(`user:${userId}`, JSON.stringify({ ...stored, hash, salt }));
      return json({ success: true });
    }

    // ── AI: coach task extraction (no auth required) ──────────────────────────
    if (path === '/ai/extract-tasks' && request.method === 'POST') {
      const body = await request.json() as {
        transcript?: string;
        image?: string;
        mimeType?: string;
        recentActivity?: string[];
      };
      const { transcript, image, mimeType = 'image/jpeg', recentActivity = [] } = body;
      if (!transcript && !image) return json({ error: 'No input provided' }, 400);

      const recentCtx = recentActivity.length > 0
        ? ` For context, this person recently worked on: ${recentActivity.slice(-5).join(', ')}.`
        : '';

      const systemPrompt = `You are Popple — a direct, warm task coach. You look at exactly what's in front of you and name specific, concrete tasks based on what you literally see or hear. Never vague, never generic. If it's a photo, describe what you actually see (specific objects, specific messes, specific items). If it's a voice note, extract exactly what the person said they need to do. Be direct like a good friend who says "hey, that coffee cup on your laptop needs to go" not "organize your workspace".${recentCtx}`;

      const extractPrompt = image
        ? `Look at this photo carefully. Identify only the most obvious, clearly visible tasks — things you are highly confident need doing based on what you can actually see. Do NOT guess or infer. Skip anything ambiguous.

Be specific (name the actual object and location), not generic. "pick up the hoodie on the chair" not "tidy up".

Return at most 5 tasks. Only include tasks you are 80%+ confident about from what's visible. If fewer things are clearly actionable, return fewer.

For each task return:
- id: sequential string ("1", "2", …)
- title: specific action title (under 10 words, starts with a verb, names the actual thing)
- difficulty_guess: "easy", "medium", or "hard"
- coach_note: one warm direct sentence (max 12 words) referencing what you see
- region: bounding box as fractions of image dimensions: { "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0 } where x,y is top-left corner

Return ONLY valid JSON with no markdown:
{"tasks": [{"id": "1", "title": "...", "difficulty_guess": "easy", "coach_note": "...", "region": {"x": 0.2, "y": 0.6, "w": 0.3, "h": 0.2}}]}`
        : `Extract every task from this voice note. Use the person's exact words and intent — don't paraphrase or generalize.

Voice note: "${transcript}"

For each task return:
- id: sequential string ("1", "2", …)
- title: clean action title using their words (under 8 words, starts with a verb)
- difficulty_guess: "easy", "medium", or "hard"
- coach_note: one warm direct sentence (max 12 words)

Return ONLY valid JSON with no markdown:
{"tasks": [{"id": "1", "title": "...", "difficulty_guess": "easy", "coach_note": "..."}]}`;

      const userContent: unknown[] = [];
      if (image) {
        userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } });
      }
      userContent.push({ type: 'text', text: extractPrompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      });

      const data = await res.json() as any;
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? '{"tasks":[]}';
      try {
        return json(JSON.parse(raw));
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) { try { return json(JSON.parse(match[0])); } catch {} }
        return json({ tasks: [] });
      }
    }

    // ── Protected routes ──────────────────────────────────────────────────────

    const userId = await getUserId(request, env);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    if (path === '/tasks') {
      if (request.method === 'GET') {
        const tasks = await env.POPPLE_DATA.get(`tasks:${userId}`);
        return json({ tasks: tasks ? JSON.parse(tasks) : [] });
      }
      if (request.method === 'POST') {
        const { tasks } = await request.json() as { tasks: unknown[] };
        await env.POPPLE_DATA.put(`tasks:${userId}`, JSON.stringify(tasks));
        return json({ success: true });
      }
    }

    if (path === '/progress') {
      if (request.method === 'GET') {
        const progress = await env.POPPLE_DATA.get(`progress:${userId}`);
        return json({ progress: progress ? JSON.parse(progress) : { level: 1, currentXP: 0, totalXP: 0, unlockedRewards: [] } });
      }
      if (request.method === 'POST') {
        const { progress } = await request.json() as { progress: unknown };
        await env.POPPLE_DATA.put(`progress:${userId}`, JSON.stringify(progress));
        return json({ success: true });
      }
    }

    if (path === '/settings') {
      if (request.method === 'GET') {
        const settings = await env.POPPLE_DATA.get(`settings:${userId}`);
        return json({ settings: settings ? JSON.parse(settings) : { backgroundTheme: 'sky', gameSettings: { animationType: 'sparkles' } } });
      }
      if (request.method === 'POST') {
        const { settings } = await request.json() as { settings: unknown };
        await env.POPPLE_DATA.put(`settings:${userId}`, JSON.stringify(settings));
        return json({ success: true });
      }
    }

    // ── AI: parse natural language task ──────────────────────────────────────
    if (path === '/ai/parse-task' && request.method === 'POST') {
      const { input } = await request.json() as { input: string };
      if (!input?.trim()) return json({ error: 'No input provided' }, 400);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: `Extract the core task from this input and return ONLY the cleaned task title — no extra words, no explanation, no punctuation at the end unless it's a question. Keep it concise (under 8 words). Input: "${input}"`,
          }],
        }),
      });

      const data = await res.json() as any;
      const title = data?.content?.[0]?.text?.trim() ?? input.trim();
      return json({ title });
    }

    // ── AI: daily briefing ────────────────────────────────────────────────────
    if (path === '/ai/briefing' && request.method === 'POST') {
      const { taskCount, completedYesterday, userName } = await request.json() as {
        taskCount: number;
        completedYesterday: number;
        userName: string;
      };

      const hour = new Date().getUTCHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const name = userName?.split('@')[0] ?? 'there';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 60,
          messages: [{
            role: 'user',
            content: `Write a single short, warm, slightly witty sentence (max 12 words) for a task app greeting. It's ${timeOfDay}. The user has ${taskCount} task${taskCount !== 1 ? 's' : ''} today${completedYesterday > 0 ? ` and completed ${completedYesterday} yesterday` : ''}. Do not include their name. No quotes. Just the sentence.`,
          }],
        }),
      });

      const data = await res.json() as any;
      const briefing = data?.content?.[0]?.text?.trim() ?? null;
      return json({ briefing, timeOfDay, name });
    }

    return json({ error: 'Not found' }, 404);
  },
};
