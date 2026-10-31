"use server";

import { and, eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { follow, list, listItem, profile, user } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import { logActivity } from "./activity";
import { ensureProfile } from "./profile";
import { validateUsername } from "./username";
import type { MediaSnapshot } from "@/lib/library/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/* ---------------------------------------------------------------- follow */

export async function setFollow(targetUserId: string, value: boolean): Promise<Result> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  if (me === targetUserId || typeof targetUserId !== "string") return { ok: false, error: "invalid" };
  if (value) {
    const exists = await db.query.user.findFirst({ where: eq(user.id, targetUserId), columns: { id: true } });
    if (!exists) return { ok: false, error: "invalid" };
    await db.insert(follow).values({ followerId: me, followingId: targetUserId }).onConflictDoNothing();
  } else {
    await db.delete(follow).where(and(eq(follow.followerId, me), eq(follow.followingId, targetUserId)));
  }
  revalidatePath("/actividad");
  return { ok: true };
}

/* --------------------------------------------------------------- profile */

export async function updateProfile(input: { username: string; name: string; bio: string }): Promise<Result<{ username: string }>> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "Inicia sesión de nuevo." };
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim().slice(0, 60);
  const bio = input.bio.trim().slice(0, 280);
  const invalid = validateUsername(username);
  if (invalid) return { ok: false, error: invalid };
  if (!name) return { ok: false, error: "El nombre no puede estar vacío." };

  const taken = await db.query.profile.findFirst({
    where: and(eq(profile.username, username), ne(profile.userId, me)),
    columns: { userId: true },
  });
  if (taken) return { ok: false, error: "Ese nombre de usuario ya está cogido." };

  await ensureProfile(me);
  await db.update(profile).set({ username, bio: bio || null }).where(eq(profile.userId, me));
  await db.update(user).set({ name }).where(eq(user.id, me));
  revalidatePath(`/u/${username}`);
  return { ok: true, username };
}

/* ----------------------------------------------------------------- lists */

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

async function ownList(me: string, listId: string) {
  return db.query.list.findFirst({ where: and(eq(list.id, listId), eq(list.userId, me)) });
}

export async function createList(input: { title: string; description?: string; isPublic?: boolean }, first?: MediaSnapshot): Promise<Result<{ id: string }>> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  const title = input.title.trim().slice(0, 80);
  if (!title) return { ok: false, error: "Ponle un nombre a la lista." };
  await ensureProfile(me);
  const id = newId();
  await db.insert(list).values({ id, userId: me, title, description: input.description?.trim().slice(0, 500) || null, isPublic: input.isPublic ?? true });
  if (first) await addToList(id, first);
  return { ok: true, id };
}

export async function updateList(listId: string, input: { title: string; description: string; isPublic: boolean }): Promise<Result> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  if (!(await ownList(me, listId))) return { ok: false, error: "invalid" };
  const title = input.title.trim().slice(0, 80);
  if (!title) return { ok: false, error: "Ponle un nombre a la lista." };
  await db
    .update(list)
    .set({ title, description: input.description.trim().slice(0, 500) || null, isPublic: input.isPublic })
    .where(eq(list.id, listId));
  revalidatePath(`/listas/${listId}`);
  return { ok: true };
}

export async function deleteList(listId: string): Promise<Result> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  await db.delete(list).where(and(eq(list.id, listId), eq(list.userId, me)));
  return { ok: true };
}

export async function addToList(listId: string, m: MediaSnapshot): Promise<Result> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  const l = await ownList(me, listId);
  if (!l || !(m.mediaType === "movie" || m.mediaType === "tv") || !(m.tmdbId > 0)) return { ok: false, error: "invalid" };
  const [{ pos } = { pos: 0 }] = await db.select({ pos: max(listItem.position) }).from(listItem).where(eq(listItem.listId, listId));
  await db
    .insert(listItem)
    .values({ listId, mediaType: m.mediaType, tmdbId: m.tmdbId, title: m.title.slice(0, 300), posterPath: m.posterPath, releaseDate: m.releaseDate, position: (pos ?? 0) + 1 })
    .onConflictDoNothing();
  await db.update(list).set({ updatedAt: new Date() }).where(eq(list.id, listId));
  if (l.isPublic) await logActivity(me, "list_add", m, { data: { listId, listTitle: l.title } });
  revalidatePath(`/listas/${listId}`);
  return { ok: true };
}

export async function removeFromList(listId: string, m: Pick<MediaSnapshot, "mediaType" | "tmdbId">): Promise<Result> {
  const me = await getUserId();
  if (!me) return { ok: false, error: "auth" };
  if (!(await ownList(me, listId))) return { ok: false, error: "invalid" };
  await db.delete(listItem).where(and(eq(listItem.listId, listId), eq(listItem.mediaType, m.mediaType), eq(listItem.tmdbId, m.tmdbId)));
  revalidatePath(`/listas/${listId}`);
  return { ok: true };
}
