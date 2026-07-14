"use client";

import React from "react";

interface AuthCardProps {
  children: React.ReactNode;
  /** Accent color for the top icon badge. */
  accent?: "lime" | "cyan" | "pink" | "yellow";
}

const ACCENT_BG: Record<NonNullable<AuthCardProps["accent"]>, string> = {
  lime: "bg-lime-brutal",
  cyan: "bg-cyan-brutal",
  pink: "bg-pink-brutal",
  yellow: "bg-yellow-brutal",
};

/**
 * Brutalist card shell reused by every auth screen.
 * Thick black border, flat zero-blur shadow, centered content.
 */
export default function AuthCard({ children, accent = "lime" }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Accent header bar */}
        <div className={`h-3 w-full ${ACCENT_BG[accent]}`} />
        <div className="p-8 space-y-6">{children}</div>
      </div>
    </div>
  );
}
