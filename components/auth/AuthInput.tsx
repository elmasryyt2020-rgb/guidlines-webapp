"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: LucideIcon;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Brutalist labeled input with optional leading icon.
 * border-brutal + focus ring + press-friendly transitions.
 */
export default function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  required,
  disabled,
}: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-display font-extrabold text-xs uppercase tracking-tight text-black"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50 stroke-[2.5] pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`w-full border-[3px] border-black bg-gray-50 font-sans font-medium text-sm text-black placeholder-black/40 py-3 ${
            Icon ? "pl-10 pr-3" : "px-3"
          } outline-none transition-all duration-150 focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 disabled:opacity-50`}
        />
      </div>
    </div>
  );
}
