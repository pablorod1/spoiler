import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile, user } from "@/lib/db/schema";
import { baseUsername } from "./username";

async function freeUsername(seed: string) {
  const base = baseUsername(seed);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 9000 + 100)}`.slice(0, 20);
    const taken = await db.query.profile.findFirst({ where: eq(profile.username, candidate), columns: { userId: true } });
    if (!taken) return candidate;
  }
  return `${base.slice(0, 10)}${Date.now().toString(36)}`.slice(0, 20);
}

/** Creates the public profile on sign-up. Idempotent. */
export async function createProfileFor(u: { id: string; name: string; email: string }) {
  const username = await freeUsername(u.name || u.email);
  await db.insert(profile).values({ userId: u.id, username }).onConflictDoNothing();
}

/** For users created before profiles existed. */
export async function ensureProfile(userId: string) {
  const existing = await db.query.profile.findFirst({ where: eq(profile.userId, userId) });
  if (existing) return existing;
  const u = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { id: true, name: true, email: true } });
  if (!u) return null;
  await createProfileFor(u);
  return db.query.profile.findFirst({ where: eq(profile.userId, userId) });
}
