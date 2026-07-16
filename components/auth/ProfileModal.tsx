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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasInitialized(false);
    } else if (isOpen && user && !hasInitialized) {
      const metaFirstName = user.user_metadata?.first_name;
      const metaLastName = user.user_metadata?.last_name;
      const metaFullName = user.user_metadata?.full_name || "";

      if (metaFirstName || metaLastName) {
        setFirstName(metaFirstName || "");
        setLastName(metaLastName || "");
      } else if (metaFullName) {
        const parts = metaFullName.trim().split(/\s+/);
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      } else {
        setFirstName("");
        setLastName("");
      }

      setSpecialty(user.user_metadata?.specialty || "");
      setHospital(user.user_metadata?.hospital || "");
      setSuccess(false);
      setErrorMsg("");
      setHasInitialized(true);
    }
  }, [isOpen, user, hasInitialized]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const combinedFullName = `${trimmedFirst} ${trimmedLast}`.trim();

      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: combinedFullName || "Clinician",
          specialty: specialty.trim(),
          hospital: hospital.trim(),
        },
      });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Box */}
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all duration-150 animate-in fade-in zoom-in-95 duration-100">
        
        {/* Header */}
        <div className="bg-yellow-brutal border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-black text-sm uppercase tracking-tight text-black">
            <User className="w-5 h-5 stroke-[2.5]" />
            <span>Edit Profile</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-effect p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none hover:bg-gray-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Body Form */}
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

          {/* Email Address (Disabled) */}
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

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ahmed"
                className="w-full p-2.5 border-[3px] border-black bg-white font-sans text-xs font-semibold text-black focus:outline-none focus:bg-cyan-brutal/5"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase text-black/60 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Ali"
                className="w-full p-2.5 border-[3px] border-black bg-white font-sans text-xs font-semibold text-black focus:outline-none focus:bg-cyan-brutal/5"
              />
            </div>
          </div>

          {/* Specialty */}
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

          {/* Hospital */}
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

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                signOut();
              }}
              className="press-effect px-4 py-2 bg-pink-brutal border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer text-black"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sign Out</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="press-effect px-4 py-2 bg-white border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer text-black"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="press-effect px-4 py-2 bg-lime-brutal border-2 border-black font-display font-extrabold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-black"
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
