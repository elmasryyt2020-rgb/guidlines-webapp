"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-black font-sans py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full border-brutal-thick bg-yellow-brutal p-8 shadow-brutal-lg space-y-6 text-center">
        <header className="space-y-2">
          <div className="w-16 h-16 rounded-full border-brutal bg-lime-brutal flex items-center justify-center mx-auto shadow-brutal mb-4">
            <ShieldCheck className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
            MOH Guidelines Assistant
          </h1>
          <p className="font-sans text-sm font-semibold text-black/70 leading-relaxed max-w-sm mx-auto">
            Clinical decision RAG assistant and diagnostics planner for Egyptian healthcare practitioners.
          </p>
        </header>

        <div className="pt-2">
          <Link
            href="/chat"
            className="press-effect w-full border-brutal bg-white p-4 font-display font-extrabold uppercase text-base shadow-brutal flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
          >
            <span>Launch Clinician Dashboard</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </Link>
        </div>

        <footer className="pt-4 border-t-2 border-black flex items-center justify-center gap-1.5 font-sans text-xs font-bold text-black/55 uppercase tracking-wide">
          Made for Doctors with <Heart className="w-3.5 h-3.5 text-pink-brutal fill-pink-brutal" /> in Egypt
        </footer>
      </div>
    </div>
  );
}
