import Link from "next/link";
import { User } from "lucide-react";
import { TmdbImage } from "@/components/ui/tmdb-image";
import { personHref } from "@/lib/tmdb/normalize";

export function PersonCard({
  person,
  role,
}: {
  person: { id: number; name: string; profile_path: string | null };
  role?: string;
}) {
  return (
    <Link href={personHref(person)} className="group block w-full text-center outline-none">
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-line transition group-hover:ring-2 group-hover:ring-accent/70 group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <TmdbImage
          path={person.profile_path}
          alt={person.name}
          fill
          sizes="160px"
          className="object-cover object-top transition duration-500 group-hover:scale-105"
          fallback={<User className="size-8 text-subtle" />}
        />
      </div>
      <p className="mt-2.5 line-clamp-1 text-sm font-medium">{person.name}</p>
      {role && <p className="line-clamp-1 text-xs text-subtle">{role}</p>}
    </Link>
  );
}
