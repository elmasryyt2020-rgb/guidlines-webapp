"use client";

import React from "react";
import { Message } from "@/lib/store";
import { User, Activity, FileText, CheckCircle, AlertTriangle } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  // Simple parser for standard markdown structures used in our responses
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // H3 headings
      if (line.startsWith("### ")) {
        return (
          <h3
            key={idx}
            className="font-display font-black text-base uppercase tracking-tight text-black mt-4 mb-2 first:mt-0 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 shrink-0 text-cyan-brutal stroke-[2.5]" />
            {line.replace("### ", "")}
          </h3>
        );
      }
      // H4 headings
      if (line.startsWith("#### ")) {
        const isRedFlag = line.toLowerCase().includes("red flag") || line.toLowerCase().includes("critical");
        return (
          <h4
            key={idx}
            className={`font-display font-bold text-sm uppercase tracking-tight mt-3 mb-1.5 flex items-center gap-2 ${
              isRedFlag ? "text-pink-brutal" : "text-black"
            }`}
          >
            {isRedFlag ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-pink-brutal stroke-[2.5]" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 text-lime-brutal stroke-[2.5]" />
            )}
            {line.replace("#### ", "")}
          </h4>
        );
      }
      // Bullet lists
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const parts = line.substring(2).split("**");
        return (
          <div key={idx} className="ml-4 flex items-start gap-2 text-sm font-sans font-medium mb-1 pl-1 text-black/90">
            <span className="text-lime-brutal font-black select-none shrink-0">•</span>
            <span>
              {parts.map((part, pIdx) =>
                pIdx % 2 === 1 ? <strong key={pIdx} className="font-black text-black">{part}</strong> : part
              )}
            </span>
          </div>
        );
      }
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        const contentStr = line.replace(/^\d+\.\s/, "");
        const parts = contentStr.split("**");
        return (
          <div key={idx} className="ml-4 font-sans text-sm font-medium mb-1 text-black/90 flex gap-1.5">
            <span className="font-mono font-bold text-xs bg-black text-white px-1 py-0.5 leading-none self-start shrink-0 border border-black shadow-[1px_1px_0px_0px_#000]">
              {line.match(/^\d+/)![0]}
            </span>
            <span>
              {parts.map((part, pIdx) =>
                pIdx % 2 === 1 ? <strong key={pIdx} className="font-black text-black">{part}</strong> : part
              )}
            </span>
          </div>
        );
      }
      // Plain paragraphs
      if (line.trim() === "") return <div key={idx} className="h-2" />;
      
      const parts = line.split("**");
      return (
        <p key={idx} className="text-sm font-sans font-medium leading-relaxed mb-2 text-black/90">
          {parts.map((part, pIdx) =>
            pIdx % 2 === 1 ? <strong key={pIdx} className="font-black text-black">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
          isUser ? "bg-cyan-brutal" : "bg-yellow-brutal"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-black stroke-[2.5]" />
        ) : (
          <Activity className="w-5 h-5 text-black stroke-[2.5]" />
        )}
      </div>

      {/* Message bubble card */}
      <div
        className={`border-brutal p-4 shadow-brutal flex flex-col justify-between transition-all duration-150 ${
          isUser ? "bg-white border-black" : "bg-[#F3F4F6] border-black"
        }`}
      >
        <div className="prose prose-sm max-w-none">
          {renderContent(message.content)}
          {message.isStreaming && (
            <span className="inline-block w-2.5 h-4 bg-black animate-pulse ml-0.5 self-center" />
          )}
        </div>
        <div className="mt-2 text-[9px] font-mono text-black/40 text-right">
          {message.timestamp}
        </div>
      </div>
    </div>
  );
}
