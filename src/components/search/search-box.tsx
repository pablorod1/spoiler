"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
      }}
      className="flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 focus-within:border-line-strong"
    >
      <Search className="size-5 text-muted" />
      <input
        name="q"
        defaultValue={initial}
        autoFocus={!initial}
        placeholder="Busca películas, series o personas"
        className="h-full w-full bg-transparent text-lg outline-none placeholder:text-subtle"
      />
    </form>
  );
}
