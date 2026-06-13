"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea heights dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="border-t-[3px] border-black p-4 bg-white">
      <div className="relative flex items-end gap-3 border-brutal p-2 bg-gray-50 focus-within:bg-white transition-colors duration-150">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder='Ask about "otitis media", "tonsillitis" or "vertigo"...'
          className="flex-1 max-h-32 min-h-[40px] resize-none outline-none font-sans font-medium text-sm bg-transparent py-2.5 px-3 placeholder-black/40 disabled:opacity-50 text-black leading-relaxed"
        />

        <div className="flex items-center gap-3 pr-2 pb-1.5 shrink-0 select-none">
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold text-black/40 uppercase">
            Enter <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
          
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="press-effect p-3 border-2 border-black bg-lime-brutal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:-translate-x-0 disabled:-translate-y-0 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            title="Send Message"
          >
            <Send className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
        </div>
      </div>
    </form>
  );
}
