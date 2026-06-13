"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Heart } from "lucide-react";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();

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
            Clinical decision RAG assistant and diagnostics planner for Egyptian healthcare practitioners.
          </p>
        </header>

        <div className="pt-2">
          {!isLoaded ? (
            <div className="h-20 flex items-center justify-center font-sans text-sm font-bold text-black animate-pulse">
              Loading authentication status...
            </div>
          ) : isSignedIn ? (
            <div className="space-y-4">
              <p className="font-sans text-sm font-bold text-black">
                Logged in as <span className="underline">{user?.emailAddresses[0]?.emailAddress}</span>
              </p>
              <Link
                href="/chat"
                className="press-effect w-full border-[3px] border-black bg-white p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150"
              >
                <span>Launch Clinician Dashboard</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
              <div className="pt-2">
                <SignOutButton>
                  <button className="press-effect text-xs font-bold uppercase underline cursor-pointer hover:text-red-600">
                    Sign Out Account
                  </button>
                </SignOutButton>
              </div>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button
                className="press-effect w-full border-[3px] border-black bg-lime-400 p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150"
              >
                <span>Sign In to Continue</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </SignInButton>
          )}
        </div>

        <footer className="pt-4 border-t-2 border-black flex items-center justify-center gap-1.5 font-sans text-xs font-bold text-black/55 uppercase tracking-wide">
          Made for Doctors with <Heart className="w-3.5 h-3.5 text-fuchsia-500 fill-fuchsia-500" /> in Egypt
        </footer>
      </div>
    </div>
  );
}
