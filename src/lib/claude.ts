const MAX = 6000;

/** Enlace que abre Claude (web o app en el celular) con el mensaje ya escrito. */
export function claudeUrl(prompt: string) {
  const text = prompt.length > MAX ? `${prompt.slice(0, MAX)}\n…(recortado)` : prompt;
  return `https://claude.ai/new?q=${encodeURIComponent(text)}`;
}

export function appUrl(path: string) {
  const base = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return base ? `${base}${path}` : "";
}

/** Línea de contexto sobre el usuario (de su perfil) para los mensajes a Claude. */
export function aboutMe(user: { name: string; bio: string }) {
  if (user.bio.trim()) return `Sobre mí: ${user.bio.trim()}`;
  return user.name ? `Me llamo ${user.name}.` : "";
}
