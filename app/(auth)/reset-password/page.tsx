"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Recovery flow sets a session via the callback; guard until we know.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/chat");
  };

  if (hasSession === null) {
    return (
      <AuthCard accent="yellow">
        <p className="text-center font-sans text-sm font-semibold text-black/60 animate-pulse">
          Loading...
        </p>
      </AuthCard>
    );
  }

  if (!hasSession) {
    // No recovery session → bounce to forgot-password
    return (
      <AuthCard accent="yellow">
        <div className="space-y-4 text-center">
          <div className="border-[3px] border-black bg-pink-brutal/20 p-4">
            <p className="font-display font-extrabold text-sm uppercase">Invalid Reset Link</p>
            <p className="font-sans text-xs font-semibold text-black/70 mt-1">
              This reset link is invalid or expired. Request a new one.
            </p>
          </div>
          <button
            onClick={() => router.push("/forgot-password")}
            className="press-effect font-display font-extrabold text-xs uppercase underline cursor-pointer"
          >
            Request new link
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard accent="yellow">
      <header className="space-y-3 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-black bg-yellow-brutal flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Lock className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-black">
          New Password
        </h1>
        <p className="font-sans text-xs font-semibold text-black/60">
          Choose a new password for your account.
        </p>
      </header>

      {error && (
        <div className="border-[3px] border-black bg-pink-brutal/20 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="font-sans text-xs font-semibold text-black">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="password" label="New Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} icon={Lock}
          placeholder="At least 6 characters" autoComplete="new-password" required
        />
        <AuthInput
          id="confirm" label="Confirm Password" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} icon={Lock}
          placeholder="Re-enter password" autoComplete="new-password" required
        />
        <AuthButton color="lime" loading={loading}>
          Update Password <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </AuthButton>
      </form>
    </AuthCard>
  );
}
