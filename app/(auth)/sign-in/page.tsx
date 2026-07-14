"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabaseClient";

type Mode = "password" | "magic";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/chat";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirect);
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  };

  return (
    <AuthCard accent="lime">
      <header className="space-y-3 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-black bg-lime-brutal flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ShieldCheck className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-black">
          Sign In
        </h1>
        <p className="font-sans text-xs font-semibold text-black/60">
          Access the MOH Guidelines Assistant workspace.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => { setMode("password"); setError(null); }}
          className={`py-2 font-display font-extrabold text-xs uppercase transition-colors duration-150 ${
            mode === "password" ? "bg-lime-brutal" : "bg-white"
          }`}
        >
          Password
        </button>
        <button
          onClick={() => { setMode("magic"); setError(null); }}
          className={`py-2 font-display font-extrabold text-xs uppercase border-l-[3px] border-black transition-colors duration-150 ${
            mode === "magic" ? "bg-cyan-brutal" : "bg-white"
          }`}
        >
          Magic Link
        </button>
      </div>

      {error && (
        <div className="border-[3px] border-black bg-pink-brutal/20 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="font-sans text-xs font-semibold text-black">{error}</p>
        </div>
      )}

      {magicSent ? (
        <div className="space-y-4 text-center">
          <div className="border-[3px] border-black bg-cyan-brutal/20 p-4">
            <p className="font-display font-extrabold text-sm uppercase">Check your email</p>
            <p className="font-sans text-xs font-semibold text-black/70 mt-1">
              A sign-in link was sent to <span className="underline">{email}</span>.
            </p>
          </div>
          <button
            onClick={() => setMagicSent(false)}
            className="press-effect font-display font-extrabold text-xs uppercase underline cursor-pointer"
          >
            Use a different method
          </button>
        </div>
      ) : mode === "password" ? (
        <form onSubmit={handlePassword} className="space-y-4">
          <AuthInput
            id="email" label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} icon={Mail}
            placeholder="you@hospital.eg" autoComplete="email" required
          />
          <AuthInput
            id="password" label="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} icon={Lock}
            placeholder="••••••••" autoComplete="current-password" required
          />
          <AuthButton loading={loading}>
            Sign In <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </AuthButton>
          <div className="flex justify-between font-sans text-xs font-semibold">
            <Link href="/forgot-password" className="press-effect underline cursor-pointer">
              Forgot password?
            </Link>
            <Link href="/sign-up" className="press-effect underline cursor-pointer">
              Create account
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMagic} className="space-y-4">
          <AuthInput
            id="magic-email" label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} icon={Mail}
            placeholder="you@hospital.eg" autoComplete="email" required
          />
          <AuthButton color="cyan" loading={loading}>
            Send Magic Link <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </AuthButton>
          <div className="flex justify-between font-sans text-xs font-semibold">
            <button type="button" onClick={() => setMode("password")} className="press-effect underline cursor-pointer">
              Use password
            </button>
            <Link href="/sign-up" className="press-effect underline cursor-pointer">
              Create account
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
