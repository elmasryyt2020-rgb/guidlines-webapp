"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthCard accent="pink">
      <header className="space-y-3 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-black bg-pink-brutal flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <KeyRound className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-black">
          Reset Password
        </h1>
        <p className="font-sans text-xs font-semibold text-black/60">
          Enter your email to receive a password reset link.
        </p>
      </header>

      {error && (
        <div className="border-[3px] border-black bg-pink-brutal/20 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="font-sans text-xs font-semibold text-black">{error}</p>
        </div>
      )}

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="border-[3px] border-black bg-lime-brutal/20 p-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-black stroke-[2.5]" />
            <p className="font-display font-extrabold text-sm uppercase">Check your email</p>
            <p className="font-sans text-xs font-semibold text-black/70">
              A reset link was sent to <span className="underline">{email}</span>.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="press-effect font-display font-extrabold text-xs uppercase underline cursor-pointer"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="email" label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} icon={Mail}
            placeholder="you@hospital.eg" autoComplete="email" required
          />
          <AuthButton color="pink" loading={loading}>
            Send Reset Link <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </AuthButton>
          <div className="text-center font-sans text-xs font-semibold">
            Remembered it?{" "}
            <Link href="/sign-in" className="press-effect underline cursor-pointer">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
