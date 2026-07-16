# User Profile Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a centered brutalist profile modal to edit clinician metadata and sign out.

**Architecture:** A React modal component that binds state to user metadata from Supabase and saves updates via auth.updateUser, triggered from a revised sidebar profile button.

**Tech Stack:** Next.js, React, Supabase Auth client, Tailwind CSS, Lucide icons.

---

### Task 1: Create ProfileModal Component

**Files:**
- Create: `components/auth/ProfileModal.tsx`

- [ ] **Step 1: Write ProfileModal.tsx**
Create the component with state hooks, form inputs, and the Supabase `updateUser` hook.

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { supabase } from "@/lib/supabaseClient";
import { X, LogOut, User, Check, AlertCircle } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, signOut } = useSupabaseSession();
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.user_metadata?.full_name || "");
      setSpecialty(user.user_metadata?.specialty || "");
      setHospital(user.user_metadata?.hospital || "");
      setSuccess(false);
      setErrorMsg("");
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          specialty: specialty.trim(),
          hospital: hospital.trim(),
        },
      });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all duration-150 animate-in fade-in zoom-in-95 duration-100">
        
        <div className="bg-yellow-brutal border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-black text-sm uppercase tracking-tight text-black">
            <User className="w-5 h-5 stroke-[2.5]" />
            <span>Edit Profile</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-effect p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          {errorMsg && (
            <div className="border-2 border-black bg-pink-brutal/20 p-3 flex items-center gap-2 text-xs font-semibold text-black">
              <AlertCircle className="w-4 h-4 text-pink-brutal shrink-0 stroke-[2.5]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="border-2 border-black bg-lime-brutal/20 p-3 flex items-center gap-2 text-xs font-semibold text-black">
              <Check className="w-4 h-4 text-lime-brutal shrink-0 stroke-[2.5]" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
              Email Address (Read-only)
            </label>
            <input
              type="text"
              disabled
              value={user.email || ""}
              className="w-full p-2.5 border-[3px] border-black bg-gray-100 font-sans text-xs font-bold text-black/60 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Ahmed Ali"
              className="w-full p-2.5 border-[3px] border-black bg-white font-sans text-xs font-semibold text-black focus:outline-none focus:bg-cyan-brutal/5"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
              Specialty / Role
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. ENT Resident, Consultant"
              className="w-full p-2.5 border-[3px] border-black bg-white font-sans text-xs font-semibold text-black focus:outline-none focus:bg-cyan-brutal/5"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
              Hospital / Workplace
            </label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="e.g. Kasr Al-Ainy Hospital"
              className="w-full p-2.5 border-[3px] border-black bg-white font-sans text-xs font-semibold text-black focus:outline-none focus:bg-cyan-brutal/5"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                signOut();
              }}
              className="press-effect px-4 py-2 bg-pink-brutal border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer text-black"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sign Out</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="press-effect px-4 py-2 bg-white border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer text-black"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="press-effect px-4 py-2 bg-lime-brutal border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-black"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### Task 2: Update Sidebar to Trigger Profile Modal

**Files:**
- Modify: `components/ui/Sidebar.tsx`
- Delete: `components/auth/UserMenu.tsx`

- [ ] **Step 1: Modify Sidebar.tsx**
Import `ProfileModal` from `@/components/auth/ProfileModal`. Replace `UserMenu` with the modal state and the inline avatar, turning the user card into a clickable button.

- [ ] **Step 2: Delete UserMenu.tsx**
Remove the file `components/auth/UserMenu.tsx` as it is no longer used.

---

### Task 3: Lint and Validate

- [ ] **Step 1: Run typechecks and linter**
Ensure syntax and compile safety by running `npm run validate`.
