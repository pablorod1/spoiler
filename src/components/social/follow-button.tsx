"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus } from "lucide-react";
import { setFollow } from "@/lib/social/actions";
import { cn } from "@/lib/cn";

export function FollowButton({
  userId,
  initial,
  loginHref,
  size = "md",
}: {
  userId: string;
  initial: boolean;
  loginHref?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [hover, setHover] = useState(false);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (loginHref) return router.push(loginHref);
    const next = !following;
    setFollowing(next);
    start(async () => {
      const res = await setFollow(userId, next);
      if (!res.ok) setFollowing(!next);
      else router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={following}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition active:scale-[0.97]",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        following
          ? hover
            ? "border border-bad/50 bg-bad/10 text-bad"
            : "border border-line-strong bg-surface-2 text-fg"
          : "bg-white text-black hover:bg-white/90",
      )}
    >
      {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {following ? (hover ? "Dejar de seguir" : "Siguiendo") : "Seguir"}
    </button>
  );
}
