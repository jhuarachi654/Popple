export interface Env {
  POPPLE_DATA: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
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

async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const user = await res.json() as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

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

    const userId = await getUserId(request, env);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    // Tasks
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

    // Progress
    if (path === '/progress') {
      if (request.method === 'GET') {
        const progress = await env.POPPLE_DATA.get(`progress:${userId}`);
        return json({
          progress: progress ? JSON.parse(progress) : {
            level: 1, currentXP: 0, totalXP: 0, unlockedRewards: [],
          },
        });
      }
      if (request.method === 'POST') {
        const { progress } = await request.json() as { progress: unknown };
        await env.POPPLE_DATA.put(`progress:${userId}`, JSON.stringify(progress));
        return json({ success: true });
      }
    }

    // Settings
    if (path === '/settings') {
      if (request.method === 'GET') {
        const settings = await env.POPPLE_DATA.get(`settings:${userId}`);
        return json({
          settings: settings ? JSON.parse(settings) : {
            backgroundTheme: 'sky',
            gameSettings: { animationType: 'sparkles' },
          },
        });
      }
      if (request.method === 'POST') {
        const { settings } = await request.json() as { settings: unknown };
        await env.POPPLE_DATA.put(`settings:${userId}`, JSON.stringify(settings));
        return json({ success: true });
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};
