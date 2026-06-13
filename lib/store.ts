"use client";

import { create } from "zustand";
import { getSupabaseClient } from "./supabaseClient";

export type GetToken = (options: { template: string }) => Promise<string | null>;

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

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  syncStatus: "synced" | "syncing" | "offline";
  
  fetchConversations: (getToken: GetToken) => Promise<void>;
  fetchMessages: (conversationId: string, getToken: GetToken) => Promise<void>;
  selectConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, content: string, isStreaming: boolean) => void;
  createNewConversation: (title: string, userId: string, getToken: GetToken) => Promise<string>;
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
  syncStatus: "synced",

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

  selectConversation: (id) => set({ activeConversationId: id }),
  
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

  createNewConversation: async (title, userId, getToken) => {
    set({ syncStatus: "syncing" });
    const supabase = await getSupabaseClient(getToken);
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title, user_id: userId })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create conversation");
    }

    // Seed mind map
    const { error: mapError } = await supabase
      .from("mind_maps")
      .insert({ conversation_id: data.id, nodes: [], edges: [] });

    if (mapError) {
      throw new Error(mapError.message || "Failed to seed mind map");
    }

    const newConv: Conversation = {
      id: data.id,
      title: data.title,
      updatedAt: "Just now",
    };

    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: data.id,
      messages: {
        ...state.messages,
        [data.id]: [],
      },
      syncStatus: "synced",
    }));

    return data.id;
  },

  setSyncStatus: (status) => set({ syncStatus: status }),
}));
