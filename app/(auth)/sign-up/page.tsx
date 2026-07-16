"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, UserPlus, ArrowRight, AlertCircle } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and Last name are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // No email confirmation required → session created immediately
    if (data.session) {
      router.push("/chat");
    } else {
      // Fallback: redirect to sign-in if no session (e.g. confirmation enabled)
      router.push("/sign-in");
    }
  };

  return (
    <AuthCard accent="cyan">
      <header className="space-y-3 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-black bg-cyan-brutal flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <UserPlus className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-black">
          Create Account
        </h1>
        <p className="font-sans text-xs font-semibold text-black/60">
          Register to access clinical guidelines and mind maps.
        </p>
      </header>

      {error && (
        <div className="border-[3px] border-black bg-pink-brutal/20 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="font-sans text-xs font-semibold text-black">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            id="firstName" label="First Name" type="text" value={firstName}
            onChange={(e) => setFirstName(e.target.value)} icon={User}
            placeholder="e.g. Ahmed" autoComplete="given-name" required
          />
          <AuthInput
            id="lastName" label="Last Name" type="text" value={lastName}
            onChange={(e) => setLastName(e.target.value)} icon={User}
            placeholder="e.g. Ali" autoComplete="family-name" required
          />
        </div>
        <AuthInput
          id="email" label="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} icon={Mail}
          placeholder="you@hospital.eg" autoComplete="email" required
        />
        <AuthInput
          id="password" label="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} icon={Lock}
          placeholder="At least 6 characters" autoComplete="new-password" required
        />
        <AuthInput
          id="confirm" label="Confirm Password" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} icon={Lock}
          placeholder="Re-enter password" autoComplete="new-password" required
        />
        <AuthButton color="cyan" loading={loading}>
          Create Account <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </AuthButton>
        <div className="text-center font-sans text-xs font-semibold">
          Already have an account?{" "}
          <Link href="/sign-in" className="press-effect underline cursor-pointer">
            Sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
