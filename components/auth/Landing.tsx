"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, UserPlus } from "lucide-react";

/**
 * Brutalist landing hero shown to signed-out visitors.
 * Mirrors the original home page aesthetic: thick borders, flat shadows, lime accent.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-black font-sans py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 text-center">
        <header className="space-y-2">
          <div className="w-16 h-16 rounded-full border-[3px] border-black bg-lime-400 flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <ShieldCheck className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
            MOH Guidelines Assistant
          </h1>
          <p className="font-sans text-sm font-semibold text-black/70 leading-relaxed max-w-sm mx-auto">
            Interactive clinical guidance engine and diagnostic mind-mapping workspace.
          </p>
        </header>

        <div className="pt-2 space-y-3">
          <Link
            href="/sign-in"
            className="press-effect w-full border-[3px] border-black bg-lime-400 p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:bg-lime-300"
          >
            <span>Sign In</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <Link
            href="/sign-up"
            className="press-effect w-full border-[3px] border-black bg-cyan-400 p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:bg-cyan-300"
          >
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
