"use client";

import { create } from "zustand";

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
  
  selectConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, content: string, isStreaming: boolean) => void;
  createNewConversation: (title: string) => void;
  setSyncStatus: (status: "synced" | "syncing" | "offline") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePane: "split",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActivePane: (pane) => set({ activePane: pane }),
}));

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "1", title: "Patient 102 - Vertigo", updatedAt: "10 mins ago" },
  { id: "2", title: "Tonsillectomy consult", updatedAt: "2 hours ago" },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    {
      id: "msg-1-1",
      role: "user",
      content: "What is the triage diagnostic approach for acute vertigo?",
      timestamp: "10 mins ago",
    },
    {
      id: "msg-1-2",
      role: "assistant",
      content: "### Peripheral vs Central Vertigo Triage\n\nFor a patient presenting with acute onset vertigo, you must distinguish between peripheral causes (e.g., BPPV, vestibular neuritis) and potentially life-threatening central causes (e.g., cerebellar stroke).\n\n#### Diagnostic Actions:\n1. **Dix-Hallpike Maneuver**:\n   * Run to confirm BPPV. Positive test shows transient rotatory nystagmus.\n2. **HINTS Exam** (Head Impulse, Nystagmus, Test of Skew):\n   * **Central signs**: Normal Head Impulse Test with presence of bidirectional nystagmus or vertical skew deviation.\n\n#### Critical Red Flags:\n* Presence of focal neurological deficits.\n* New-onset intense headache or neck pain.\n* Inability to stand or sit independently.",
      timestamp: "9 mins ago",
    }
  ],
  "2": [
    {
      id: "msg-2-1",
      role: "user",
      content: "When should we refer a child for a tonsillectomy?",
      timestamp: "2 hours ago",
    },
    {
      id: "msg-2-2",
      role: "assistant",
      content: "### Tonsillectomy Referral Guidelines\n\nUnder Egyptian Ministry of Health directives, clinical indications for pediatric tonsillectomy must meet specific frequency criteria:\n\n#### Absolute Frequency Thresholds:\n* **7 or more** documented, clinically significant sore throat episodes in the preceding year.\n* **5 or more** episodes per year in the preceding 2 years.\n* **3 or more** episodes per year in the preceding 3 years.\n\n#### Episode Definition Criteria:\nEach episode must have a documented temperature >38.3°C, cervical lymphadenopathy, tonsillar exudate, or positive Group A Beta-Hemolytic Streptococcus culture.",
      timestamp: "2 hours ago",
    }
  ]
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: MOCK_CONVERSATIONS,
  activeConversationId: "1",
  messages: MOCK_MESSAGES,
  syncStatus: "synced",

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

  createNewConversation: (title) =>
    set((state) => {
      const newId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: newId,
        title,
        updatedAt: "Just now",
      };
      return {
        conversations: [newConv, ...state.conversations],
        activeConversationId: newId,
        messages: {
          ...state.messages,
          [newId]: [],
        },
      };
    }),

  setSyncStatus: (status) => set({ syncStatus: status }),
}));
