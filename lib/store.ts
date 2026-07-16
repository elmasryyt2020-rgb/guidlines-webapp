"use client";

import { create } from "zustand";
import { getSupabaseClient, checkSupabaseConnectivity } from "./supabaseClient";

export type GetToken = (options?: { template?: string }) => Promise<string | null>;

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface DBConversation {
  id: string;
  title: string;
  updated_at: string;
}

interface DBMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  activePane: "chat" | "mindmap" | "split";
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePane: (pane: "chat" | "mindmap" | "split") => void;
}

// Local-only draft id. Never written to the DB; the chat edge function creates
// the real conversation row on the first message.
export const DRAFT_CONVERSATION_ID = "draft";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  draftConversation: Conversation | null;
  syncStatus: "synced" | "syncing" | "offline";
  
  checkDBConnection: () => Promise<void>;
  fetchConversations: (getToken: GetToken) => Promise<void>;
  fetchMessages: (conversationId: string, getToken: GetToken) => Promise<void>;
  selectConversation: (id: string) => void;
  startDraftConversation: () => void;
  clearDraft: () => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, content: string, isStreaming: boolean) => void;
  setSyncStatus: (status: "synced" | "syncing" | "offline") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePane: "split",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActivePane: (pane) => set({ activePane: pane }),
}));

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  draftConversation: null,
  syncStatus: "syncing",

  checkDBConnection: async () => {
    set({ syncStatus: "syncing" });
    const isReachable = await checkSupabaseConnectivity();
    set({ syncStatus: isReachable ? "synced" : "offline" });
  },

  fetchConversations: async (getToken) => {
    set({ syncStatus: "syncing" });
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted = (data as unknown as DBConversation[] || []).map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      set({ conversations: formatted, syncStatus: "synced" });
      
      // Select first conversation if none active
      if (formatted.length > 0 && !get().activeConversationId) {
        get().selectConversation(formatted[0].id);
      }
    } catch (err) {
      console.error(err);
      set({ syncStatus: "offline" });
    }
  },

  fetchMessages: async (conversationId, getToken) => {
    // Skip fetching if the conversation is currently streaming to prevent overwriting active stream state.
    const current = get().messages[conversationId] || [];
    if (current.some((m) => m.isStreaming)) {
      return;
    }
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted = (data as unknown as DBMessage[] || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: formatted
        }
      }));
    } catch (err) {
      console.error("Fetch messages failed", err);
    }
  },

  selectConversation: (id) =>
    set((state) => ({
      activeConversationId: id,
      // Selecting another conversation abandons the unsaved local draft.
      draftConversation: state.draftConversation && state.draftConversation.id !== id
        ? null
        : state.draftConversation,
    })),

  startDraftConversation: () => {
    const state = get();
    // Reuse an existing empty draft instead of creating a duplicate.
    if (state.draftConversation) {
      set({ activeConversationId: state.draftConversation.id });
      return;
    }
    // Reuse an already-active real conversation that has no messages yet.
    const activeId = state.activeConversationId;
    if (activeId && activeId !== DRAFT_CONVERSATION_ID && (state.messages[activeId] || []).length === 0) {
      return;
    }
    const draft: Conversation = {
      id: DRAFT_CONVERSATION_ID,
      title: "New Consultation",
      updatedAt: "Just now",
    };
    set((s) => ({
      draftConversation: draft,
      activeConversationId: DRAFT_CONVERSATION_ID,
      messages: { ...s.messages, [DRAFT_CONVERSATION_ID]: [] },
    }));
  },

  clearDraft: () => set({ draftConversation: null }),
  
  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMessages, message],
        },
      };
    }),

  updateLastMessage: (conversationId, content, isStreaming) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      if (currentMessages.length === 0) return {};
      const updated = [...currentMessages];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content,
        isStreaming,
      };
      return {
        messages: {
          ...state.messages,
          [conversationId]: updated,
        },
      };
    }),

  setSyncStatus: (status) => set({ syncStatus: status }),
}));
