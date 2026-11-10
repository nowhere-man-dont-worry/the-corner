import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    '[the-corner] Supabase env vars missing. Chat will run in local-only mode.'
  );
}

export const supabase = url && key ? createClient(url, key) : null;

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithGitHub() {
  if (!supabase) return;
  try { sessionStorage.setItem('corner-post-auth', 'create'); } catch (e) {}
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  location.reload();
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => subscription.unsubscribe();
}
