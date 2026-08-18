"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useChatStore, DRAFT_CONVERSATION_ID } from "@/lib/store";
import { useMindMapStore } from "@/lib/mindmapStore";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { BookOpen } from "lucide-react";

export default function ChatPanel() {
  const { user } = useSupabaseSession();
  const { getToken } = useSupabaseSession();

  const {
    activeConversationId,
    messages,
    addMessage,
    updateLastMessage,
    setSyncStatus,
    fetchConversations,
    fetchMessages,
    selectConversation,
    checkDBConnection,
  } = useChatStore();

  const { fetchMindMap, resetLocalMindMap } = useMindMapStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingConvIdRef = useRef<string | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const [, setStreamTick] = React.useState<number>(0);

  const activeMessages = useMemo(() => {
    return activeConversationId ? messages[activeConversationId] || [] : [];
  }, [activeConversationId, messages]);

  const lastMsg = activeMessages[activeMessages.length - 1];
  const isAssistantStreaming = lastMsg?.role === "assistant" && !!lastMsg?.isStreaming;

  // Probe DB reachability immediately on mount (auth-independent)
  useEffect(() => {
    checkDBConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load conversations on mount / user change
  useEffect(() => {
    if (user) {
      fetchConversations(getToken);
    }
  }, [user, getToken, fetchConversations]);

  // Load messages and mindmap when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    if (activeConversationId === DRAFT_CONVERSATION_ID) {
      // Draft is local-only: blank the canvas, no DB fetch.
      resetLocalMindMap();
      return;
    }
    // Skip DB fetch while a stream is in progress for this conversation
    if (isStreamingRef.current && activeConversationId === streamingConvIdRef.current) return;
    fetchMessages(activeConversationId, getToken);
    fetchMindMap(activeConversationId, getToken);
  }, [activeConversationId, getToken, fetchMessages, fetchMindMap, resetLocalMindMap]);

  // Abort stream ONLY if user explicitly switches away to a DIFFERENT conversation
  useEffect(() => {
    if (
      abortControllerRef.current &&
      streamingConvIdRef.current &&
      activeConversationId !== streamingConvIdRef.current
    ) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      const staleId = streamingConvIdRef.current;
      streamingConvIdRef.current = null;
      isStreamingRef.current = false;

      // Finalize last message on stale conversation
      if (staleId) {
        const state = useChatStore.getState();
        const currentMsgs = state.messages[staleId] || [];
        const last = currentMsgs[currentMsgs.length - 1];
        if (last && last.role === "assistant" && last.isStreaming) {
          state.updateLastMessage(staleId, last.content, false);
        }
        state.setSyncStatus("synced");
      }
    }
  }, [activeConversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const tempConvId = activeConversationId || DRAFT_CONVERSATION_ID;
    const isDraft = !activeConversationId || activeConversationId === DRAFT_CONVERSATION_ID;
    let activeId = tempConvId;

    streamingConvIdRef.current = tempConvId;
    isStreamingRef.current = true;
    setSyncStatus("syncing");

    // Add user message and assistant placeholder to UI state immediately so they render instantly
    const userMessageId = `msg-${Date.now()}`;
    const assistantMessageId = `msg-reply-${Date.now()}`;

    addMessage(tempConvId, {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: "Just now",
    });

    addMessage(tempConvId, {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: "Just now",
      isStreaming: true,
    });

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

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
            // Drafts have no DB row yet; the server creates one on first message.
            conversationId: isDraft ? undefined : tempConvId,
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        let errorMsg = "An error occurred while communicating with the medical assistant server.";
        try {
          const bodyText = await response.text();
          try {
            const parsed = JSON.parse(bodyText);
            let innerMsg = parsed.error || bodyText;
            // Check if the error message itself is a nested JSON string (e.g. from Gemini API)
            if (typeof innerMsg === "string" && innerMsg.includes("{")) {
              const startIdx = innerMsg.indexOf("{");
              const jsonStr = innerMsg.substring(startIdx);
              try {
                const innerParsed = JSON.parse(jsonStr);
                if (innerParsed.error && innerParsed.error.message) {
                  innerMsg = `Failed to call Gemini: ${innerParsed.error.message}`;
                }
              } catch {}
            }
            errorMsg = innerMsg;
          } catch {
            errorMsg = bodyText;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      // Check if conversation ID changed (new conversation generated on server)
      const returnedConvId = response.headers.get("X-Conversation-Id");

      if (returnedConvId && returnedConvId !== tempConvId) {
        activeId = returnedConvId;
        // Update streaming conversation ref first so effects don't treat this as an external switch
        streamingConvIdRef.current = returnedConvId;

        if (isDraft) {
          // Atomic: migrate messages, switch active ID, and clear draft in one setState
          // so there's no gap where activeConversationId points at an empty draft.
          const draftMessages = useChatStore.getState().messages[tempConvId] || [];
          useChatStore.setState((s) => ({
            activeConversationId: returnedConvId,
            draftConversation: null,
            messages: {
              ...s.messages,
              [returnedConvId]: draftMessages,
              [tempConvId]: [],
            },
          }));
        } else {
          selectConversation(activeId);
        }
        // Refresh sidebar list (fire-and-forget, no need to block the stream)
        fetchConversations(getToken);
      }

      if (!activeId) {
        throw new Error("No active conversation ID returned from server.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to initialize response stream reader.");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || abortController.signal.aborted) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        updateLastMessage(activeId, accumulatedText, true);
        setStreamTick((t) => t + 1);
      }

      if (!abortController.signal.aborted) {
        // Finalize message stream
        isStreamingRef.current = false;
        streamingConvIdRef.current = null;
        updateLastMessage(activeId, accumulatedText, false);
        setSyncStatus("synced");

        // Fetch mind map updates to sync if the map changes alongside the chat RAG
        await fetchMindMap(activeId, getToken);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (abortController.signal.aborted) {
        return;
      }
      console.warn("Chat streaming failed", err);
      setSyncStatus("synced");

      const targetId = activeId || tempConvId || "error";
      const errorMsg = err instanceof Error ? err.message : "An error occurred while communicating with the medical assistant server.";
      updateLastMessage(
        targetId,
        errorMsg,
        false
      );
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        streamingConvIdRef.current = null;
        isStreamingRef.current = false;
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
      {/* Panel Header */}
      <div className="h-[73px] px-5 border-b-[3px] border-black flex items-center justify-between bg-cyan-brutal/10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-black stroke-[2.5]" />
          <span className="font-display font-black text-sm uppercase tracking-tight">
            Clinical Guidelines Assistant
          </span>
        </div>
        <span className="font-mono text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0px_0px_#000]">
          MOH
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
