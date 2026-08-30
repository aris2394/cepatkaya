import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/auth';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const token = cookies.get('ck_session')?.value;
  const { cookie } = await destroySession(locals, token);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  });
};
