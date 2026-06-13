"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useChatStore } from "@/lib/store";
import { useMindMapStore } from "@/lib/mindmapStore";
import { useAuth, useUser } from "@clerk/nextjs";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { BookOpen } from "lucide-react";

export default function ChatPanel() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const {
    activeConversationId,
    messages,
    addMessage,
    updateLastMessage,
    setSyncStatus,
    fetchConversations,
    fetchMessages,
    selectConversation,
  } = useChatStore();

  const { fetchMindMap } = useMindMapStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const activeMessages = useMemo(() => {
    return activeConversationId ? messages[activeConversationId] || [] : [];
  }, [activeConversationId, messages]);
  const isAssistantStreaming = activeMessages.some((msg) => msg.role === "assistant" && msg.isStreaming);

  // Load conversations on mount / user change
  useEffect(() => {
    if (user) {
      fetchConversations(getToken);
    }
  }, [user, getToken, fetchConversations]);

  // Load messages and mindmap when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId, getToken);
      fetchMindMap(activeConversationId, getToken);
    }
  }, [activeConversationId, getToken, fetchMessages, fetchMindMap]);

  // Cleanup stream when user switches conversations or unmounts
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;

        // Reset streaming state in store to prevent input from being permanently disabled
        if (activeConversationId) {
          const state = useChatStore.getState();
          const currentMsgs = state.messages[activeConversationId] || [];
          const lastMsg = currentMsgs[currentMsgs.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && lastMsg.isStreaming) {
            state.updateLastMessage(activeConversationId, lastMsg.content, false);
          }
          state.setSyncStatus("synced");
        }
      }
    };
  }, [activeConversationId]);

  // Scroll to bottom under proper UX rules (if user sent message or user is already close to bottom)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isUserLast = activeMessages.length > 0 && activeMessages[activeMessages.length - 1].role === "user";
    const isCloseToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isUserLast || isCloseToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [activeMessages]);

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    // Clear existing stream if any
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const tempConvId = activeConversationId;
    let activeId = tempConvId;
    setSyncStatus("syncing");

    const assistantMessageId = `msg-reply-${Date.now()}`;

    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            conversationId: tempConvId || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Check if conversation ID changed (new conversation generated on server)
      const returnedConvId = response.headers.get("X-Conversation-Id");

      if (returnedConvId && returnedConvId !== tempConvId) {
        activeId = returnedConvId;
        // Seed the conversation in store list
        await fetchConversations(getToken);
        selectConversation(activeId);
      }

      if (!activeId) {
        throw new Error("No active conversation ID returned from server.");
      }

      // Add user message to UI state immediately
      addMessage(activeId, {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: "Just now",
      });

      // Add assistant placeholder
      addMessage(activeId, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: "Just now",
        isStreaming: true,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      // Setup a way to abort/cleanup if conversation changes
      let isAborted = false;
      cleanupRef.current = () => {
        isAborted = true;
        try {
          reader?.cancel();
        } catch {}
      };

      while (true) {
        const { done, value } = await reader!.read();
        if (done || isAborted) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        updateLastMessage(activeId, accumulatedText, true);
      }

      if (!isAborted) {
        // Finalize message stream
        updateLastMessage(activeId, accumulatedText, false);
        setSyncStatus("synced");

        // Fetch mind map updates to sync if the map changes alongside the chat RAG
        await fetchMindMap(activeId, getToken);
      }

      cleanupRef.current = null;

    } catch (err) {
      console.error("Chat streaming failed", err);
      setSyncStatus("offline");

      const targetId = activeId || tempConvId || "error";
      addMessage(targetId, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "An error occurred while communicating with the medical assistant server.",
        timestamp: "Just now",
      });
    }
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
