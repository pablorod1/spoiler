"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";

const mq = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(mq);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(mq).matches, () => true);

/**
 * Filter-style popover: pill trigger that summarises the selection.
 * Desktop: anchored dropdown. Mobile: bottom sheet. Closes on Esc / outside click.
 */
export function Popover({
  label,
  summary,
  active,
  icon,
  align = "left",
  width = "md:w-80",
  children,
}: {
  label: string;
  summary?: string | null;
  active?: boolean;
  icon?: React.ReactNode;
  align?: "left" | "right";
  width?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const id = useId();
  const triggerId = `${id}-trigger`;
  // Return focus to the trigger (looked up by id so `close` can be handed to children safely).
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !sheet.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      document.getElementById(triggerId)?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, triggerId]);

  const panelNode = (
        <>
          <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
          <div
            ref={sheet}
            id={id}
            role="dialog"
            aria-label={label}
            className={cn(
              "z-[60] overflow-hidden border border-line-strong bg-surface/95 shadow-2xl backdrop-blur-xl animate-fade-up",
              // mobile: bottom sheet
              "fixed inset-x-0 bottom-0 max-h-[75svh] rounded-t-3xl pb-[env(safe-area-inset-bottom)]",
              // desktop: dropdown
              "md:absolute md:inset-x-auto md:bottom-auto md:top-11 md:max-h-[70vh] md:rounded-2xl md:pb-0",
              align === "right" ? "md:right-0" : "md:left-0",
              width,
            )}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5 md:hidden">
              <p className="font-semibold">{label}</p>
              <button type="button" onClick={close} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full bg-surface-3">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[calc(75svh-60px)] overflow-y-auto p-2 md:max-h-[70vh]">{children(close)}</div>
          </div>
        </>
  );

  return (
    <div ref={root} className="relative shrink-0">
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border pl-3.5 pr-2.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          active ? "border-white/80 bg-white text-black" : "border-line bg-surface text-fg/85 hover:border-line-strong",
          open && !active && "border-line-strong bg-surface-2",
        )}
      >
        {icon}
        <span className="max-w-40 truncate">{summary || label}</span>
        <ChevronDown className={cn("size-4 opacity-60 transition", open && "rotate-180")} />
      </button>

      {open &&
        (desktop
          ? panelNode
          : createPortal(panelNode, document.body))}
    </div>
  );
}

export function OptionRow({
  selected,
  onClick,
  children,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "menuitemcheckbox" : "menuitemradio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition outline-none hover:bg-surface-3 focus-visible:bg-surface-3",
        selected && "text-fg",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center border transition",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
        )}
      >
        {selected && (multi ? <svg viewBox="0 0 12 12" className="size-3"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <span className="size-2 rounded-full bg-accent-fg" />)}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}
