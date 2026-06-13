"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useChatStore } from "@/lib/store";
import { getMockResponse, simulateStreaming } from "@/lib/streaming";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { BookOpen } from "lucide-react";

export default function ChatPanel() {
  const { activeConversationId, messages, addMessage, updateLastMessage, setSyncStatus } = useChatStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeMessages = useMemo(() => {
    return activeConversationId ? messages[activeConversationId] || [] : [];
  }, [activeConversationId, messages]);
  const isAssistantStreaming = activeMessages.some((msg) => msg.role === "assistant" && msg.isStreaming);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeMessages]);

  const handleSendMessage = (text: string) => {
    if (!activeConversationId) return;

    // 1. Add User Message
    const userMessageId = `msg-${Date.now()}`;
    addMessage(activeConversationId, {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: "Just now",
    });

    // 2. Set DB SyncStatus as syncing
    setSyncStatus("syncing");

    // 3. Add Placeholder Assistant Message
    const assistantMessageId = `msg-reply-${Date.now()}`;
    addMessage(activeConversationId, {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: "Just now",
      isStreaming: true,
    });

    // 4. Retrieve matching mock answer and stream
    const matchedContent = getMockResponse(text);
    
    simulateStreaming(matchedContent, (chunk, isStreaming) => {
      updateLastMessage(activeConversationId, chunk, isStreaming);
      if (!isStreaming) {
        // Completed stream - mark synced
        setSyncStatus("synced");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b-[3px] border-black flex items-center justify-between bg-cyan-brutal/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-black stroke-[2.5]" />
          <span className="font-display font-black text-sm uppercase tracking-tight">
            Clinical Guidelines RAG Chat
          </span>
        </div>
        <span className="font-mono text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0px_0px_#000]">
          MOH v2.5
        </span>
      </div>

      {/* Scrollable Message Thread */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#F3F4F6] bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {activeMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div className="border-brutal bg-white p-6 shadow-brutal max-w-sm">
              <p className="font-display font-black uppercase text-sm mb-2">No Active Discussion</p>
              <p className="font-sans text-xs font-semibold text-black/60 leading-relaxed">
                Type a clinical query below or select a consultation log to begin retrieval.
              </p>
            </div>
          </div>
        ) : (
          activeMessages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
      </div>

      {/* Input box */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isAssistantStreaming} />
    </div>
  );
}
