"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  color?: "lime" | "cyan" | "pink" | "white";
  fullWidth?: boolean;
}

const COLOR_BG: Record<NonNullable<AuthButtonProps["color"]>, string> = {
  lime: "bg-lime-brutal",
  cyan: "bg-cyan-brutal",
  pink: "bg-pink-brutal",
  white: "bg-white",
};

/**
 * Brutalist submit/action button with physical press effect + loading spinner.
 */
export default function AuthButton({
  children,
  type = "submit",
  onClick,
  loading = false,
  disabled = false,
  color = "lime",
  fullWidth = true,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`press-effect ${COLOR_BG[color]} border-[3px] border-black font-display font-extrabold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
        fullWidth ? "w-full py-3.5" : "px-5 py-2.5"
      }`}
    >
      {loading && <Loader2 className="w-4 h-4 stroke-[2.5] animate-spin" />}
      {children}
    </button>
  );
}
