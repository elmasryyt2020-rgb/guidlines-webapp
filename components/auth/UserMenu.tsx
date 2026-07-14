"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { LogOut } from "lucide-react";

/**
 * Replaces Clerk's <UserButton>. Brutalist avatar with initials that opens a
 * small popover showing the email + a Sign Out action.
 */
export default function UserMenu() {
  const { user, signOut } = useSupabaseSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const email = user?.email ?? "Unknown";
  const initials = (user?.email ?? "DR")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="press-effect w-9 h-9 border-[3px] border-black bg-cyan-brutal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-display font-black text-xs uppercase cursor-pointer"
        title={email}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
          <div className="border-b-[3px] border-black bg-yellow-brutal px-3 py-2">
            <div className="font-display font-black text-xs uppercase truncate">
              {user?.user_metadata?.full_name || "Clinician"}
            </div>
            <div className="font-sans text-[10px] font-semibold text-black/60 truncate">
              {email}
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="press-effect w-full px-3 py-2.5 flex items-center gap-2 font-display font-extrabold text-xs uppercase hover:bg-pink-brutal/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
