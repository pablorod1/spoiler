"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email. Inicia sesión.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email. Inicia sesión.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  INVALID_EMAIL: "Ese email no parece válido.",
};

function safeRedirect(to: string | undefined) {
  return to && to.startsWith("/") && !to.startsWith("//") ? to : "/";
}

export function AuthForm({ redirectTo, googleEnabled }: { redirectTo?: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const target = safeRedirect(redirectTo);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "").trim();
    setError(null);
    start(async () => {
      const res =
        mode === "login"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name: name || email.split("@")[0] });
      if (res.error) {
        setError(ERRORS[res.error.code ?? ""] ?? res.error.message ?? "Algo ha fallado. Inténtalo de nuevo.");
        return;
      }
      router.replace(target);
      router.refresh();
    });
  };

  const field =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition placeholder:text-subtle focus:border-accent";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 grid grid-cols-2 rounded-full border border-line bg-surface p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn("h-9 rounded-full transition", mode === m ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => signIn.social({ provider: "google", callbackURL: target })}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-black transition hover:bg-white/90"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            Continuar con Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" /> o con tu email <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && <input name="name" placeholder="Tu nombre" autoComplete="name" className={field} />}
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className={field} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={mode === "signup" ? "Contraseña (mín. 8 caracteres)" : "Contraseña"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={field}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-fg transition hover:brightness-110 disabled:opacity-60"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </button>
      </form>
    </div>
  );
}
