/** Shared (client + server) username rules. */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin", "api", "app", "whatcher", "soporte", "ayuda", "ajustes", "perfil", "entrar", "salir",
  "actividad", "listas", "lista", "u", "me", "yo", "root", "null", "undefined",
]);

export function validateUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return "Entre 3 y 20 caracteres: letras, números o guion bajo.";
  if (RESERVED.has(u)) return "Ese nombre está reservado.";
  return null;
}

export function baseUsername(nameOrEmail: string) {
  const base = nameOrEmail
    .split("@")[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return base.length >= 3 && !RESERVED.has(base) ? base : `cinefilo_${base}`.slice(0, 16);
}
