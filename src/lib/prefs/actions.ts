"use server";

import { cookies } from "next/headers";
import { PROVIDERS_COOKIE } from "./constants";

export async function saveMyProviders(ids: number[]) {
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 30);
  const store = await cookies();
  if (!clean.length) {
    store.delete(PROVIDERS_COOKIE);
    return;
  }
  store.set(PROVIDERS_COOKIE, clean.join("."), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
