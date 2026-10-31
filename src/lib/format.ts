const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export const year = (date: string | null | undefined) => (date ? date.slice(0, 4) : "");

export function formatDate(date: string | null | undefined) {
  if (!date) return "";
  return dateFmt.format(new Date(date + "T00:00:00"));
}

export function formatShortDate(date: string | null | undefined) {
  if (!date) return "";
  return shortDateFmt.format(new Date(date + "T00:00:00"));
}

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export const formatCount = (n: number) => compact.format(n);
export const formatMoney = (n: number | undefined) => (n ? money.format(n) : "");

export const formatRating = (v: number) => (v ? v.toFixed(1).replace(".", ",") : "–");

export function ratingTone(v: number, votes = 100): "good" | "mid" | "bad" | "none" {
  if (!v || votes < 5) return "none";
  if (v >= 7) return "good";
  if (v >= 5.5) return "mid";
  return "bad";
}

export function age(birthday: string | null, deathday?: string | null) {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const b = new Date(birthday);
  let a = end.getFullYear() - b.getFullYear();
  if (end.getMonth() < b.getMonth() || (end.getMonth() === b.getMonth() && end.getDate() < b.getDate())) a--;
  return a;
}

const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
/** "hace 5 min", "ayer"… `now` is passed in so callers control when the clock is read. */
export function timeAgo(date: Date | number, now: number) {
  const diff = (new Date(date).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "ahora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / (86400 * 7)), "week");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}
