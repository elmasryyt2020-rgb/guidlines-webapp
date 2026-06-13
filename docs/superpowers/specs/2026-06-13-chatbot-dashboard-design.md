# Design Specification: Chatbot Dashboard Layout and Sidebar UI

This document specifies the architecture, UI layout, components, and state management system for the prototype phase of the **Medical Guidelines Assistant** dashboard.

## Overview

Egyptian healthcare doctors need a high-utility, distraction-free environment to retrieve Ministry of Health (MOH) clinical guidelines and visualize diagnosis paths. This UI is designed around a **responsive split-pane grid** (40% Chatbot, 60% Mind Map) built with a raw **Neo-brutalist design system** (thick borders, flat shadows, high-contrast highlighting).

---

## 1. Architecture & Component Structure

We will adopt a modular component-driven architecture:

```txt
components/
  ui/
    Sidebar.tsx       # Collapsible side navigation with user, chats, & sync status
    Button.tsx        # Neo-brutalist buttons with hover/press transition states
  chat/
    ChatPanel.tsx     # Message log and input box wrapper
    ChatBubble.tsx    # Message speech bubble with clean markdown formatting
    ChatInput.tsx     # Clinical chat command and query input bar
app/
  chat/
    page.tsx          # Chat dashboard entry screen
```

### Components Responsibility Map:
*   **`Sidebar`**: Manages state of expanding/collapsing, lists history of conversations, displays database sync states, and user actions.
*   **`ChatPanel`**: Containers for message threads, manages scrolling to bottom on new updates, and handles query dispatching.
*   **`ChatBubble`**: Renders message bubbles. Assistant bubbles parse Markdown (tables/lists) and render specific Lucide icons depending on response section headers.
*   **`ChatInput`**: Styled text field with input state, submission button, and disabled states during streaming.

---

## 2. State Management (Zustand)

Global states will be managed via Zustand in `lib/store.ts` to ensure decoupled UI components:

### A. UI Store (`useUIStore`)
```typescript
interface UIState {
  sidebarCollapsed: boolean;
  activePane: "chat" | "mindmap" | "split";
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePane: (pane: "chat" | "mindmap" | "split") => void;
}
```

### B. Chat Store (`useChatStore`)
```typescript
interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
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
```

---

## 3. UI Styling & Theme Variables

All styling will extend the Neo-brutalist utility classes defined in `app/globals.css`:
*   **Borders**: `border-brutal` (3px border-black) or `border-brutal-thick` (4px border-black)
*   **Shadows**: `shadow-brutal` (4px offset, no blur) or `shadow-brutal-lg` (6px offset)
*   **Press transitions**: `press-effect` for all button/item actions
*   **Colors**:
    *   Lime: `bg-lime-brutal` (`#A3E635`) for active primary actions
    *   Pink: `bg-pink-brutal` (`#D946EF`) for warning/danger indicators
    *   Cyan: `bg-cyan-brutal` (`#06B6D4`) for primary reference panels
    *   Yellow: `bg-yellow-brutal` (`#FACC15`) for system alerts/status
    *   Neutral Grid Background: `bg-[#F3F4F6]` with subtle grid elements

---

## 4. Simulated Streaming Protocol

To simulate real-time API responses, we will map user queries to pre-defined ENT guidelines:

### Predefined ENT Guides Mapping:
1.  **"Otitis Media"**: Guidelines on Acute Otitis Media. Focuses on diagnostic criteria (bulging membrane) and weight-based Amoxicillin dosages (80-90 mg/kg/day).
2.  **"Tonsil" / "Tonsillitis"**: Guidelines for throat inspection, scoring using Centor criteria, criteria for antibiotic administration, and criteria for tonsillectomy referral.
3.  **"Vertigo"**: Vestibular triage guidelines including BPPV (Dix-Hallpike maneuver, Epley repositioning) and red flags indicating central lesions (HINTS exam).
4.  **Fallback**: Standard diagnostic instructions directing the doctor to key ENT guidelines index.

### Streaming Interval Flow:
*   Words/Chunks are pushed sequentially to the active message's content array.
*   Pacing: 100ms per word block to simulate human reading pace.
*   No emojis are present in any string chunk.

---

## 5. Verification & Testing Plan

1.  **Responsive Layout Check**: View on mobile resolution (360px), tablet (768px), and desktop (1440px) to verify appropriate split behaviors.
2.  **Visual Regression Check**: Ensure thick borders are aligned and drop shadows do not double-render.
3.  **TypeScript Verification**: Run `npm run typecheck` to confirm Zustand action types are properly aligned.
4.  **Linter Verification**: Run `npm run lint` to prevent build issues.
