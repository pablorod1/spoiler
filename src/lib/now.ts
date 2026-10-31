import "server-only";
import { connection } from "next/server";

/** Current time for request-time rendering (relative dates). */
export async function requestNow() {
  await connection();
  return Date.now();
}
