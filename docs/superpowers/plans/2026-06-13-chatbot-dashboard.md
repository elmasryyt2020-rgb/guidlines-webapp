# Chatbot Dashboard Layout and Sidebar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, high-utility, Neo-brutalist Chatbot Dashboard and Sidebar layout using Next.js, Tailwind CSS, and Zustand with simulated clinical guidance streaming.

**Architecture:** Create modular, layout-independent components for Sidebar, ChatPanel, ChatBubble, and ChatInput. Implement a dual Zustand store setup to decouple UI collapse/triage layout actions from conversation state management, and orchestrate these side-by-side inside `/chat`.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, Lucide React icons, Zustand, TypeScript.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Zustand**
  Run command:
  ```powershell
  npm install zustand
  ```
  Expected Output: Successful installation of `zustand`.

- [ ] **Step 2: Verify existing workspace builds**
  Run command:
  ```powershell
  npm run typecheck
  ```
  Expected Output: Successful compilation with no TypeScript errors.

---

### Task 2: Create State Stores

**Files:**
- Create: `lib/store.ts`

- [ ] **Step 1: Write Zustand UI and Chat Stores**
  Create the file `lib/store.ts` containing all states and actions for UI layouts and chat data.
  
  ```typescript
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
  ```

- [ ] **Step 2: Commit store implementation**
  Run commands:
  ```powershell
  git add lib/store.ts
  git commit -m "feat: implement Zustand stores for layout and chat state"
  ```

---

### Task 3: Mock Clinical Response Registry & Streaming Generator

**Files:**
- Create: `lib/streaming.ts`

- [ ] **Step 1: Write Response Generator**
  Create a helper utility `lib/streaming.ts` that registries clinical answers and implements the timer-based stream simulator.

  ```typescript
  const CLINICAL_RESPONSES: Record<string, string> = {
    "otitis media": `### Acute Otitis Media (AOM) Clinical Guidelines

Review diagnostic thresholds and drug dosing instructions according to local clinical standards.

#### 1. Diagnostic Indicators
* **Tympanic Membrane (TM)**: Severe bulging, moderate bulging accompanied by new-onset otorrhea, or intense erythema.
* **Symptoms**: Sudden onset ear pain (otalgia), irritability, and fever.

#### 2. Treatment Strategy
* **First-Line Therapy**: Amoxicillin.
* **Pediatric Dosage**: **80-90 mg/kg/day** divided into two doses (maximum 3g/day).
* **Duration**: 10 days for patients under 2 years; 5-7 days for patients 6 years and older with mild-to-moderate symptoms.

#### 3. Observation Option
May observe for 48-72 hours in children 6 months to 2 years with unilateral, non-severe symptoms, provided reliable follow-up is guaranteed.`,

    "tonsil": `### Acute Tonsillitis Consultation Guidelines

Follow the standardized assessment pathway for patients presenting with sore throat.

#### 1. Clinical Scoring (Centor Score)
Administer 1 point for each indicator:
* Tonsillar exudates present
* Tender anterior cervical adenopathy
* History of fever (>38.0°C)
* Absence of cough
* Age parameter (1 point for 3-14 years; 0 points for 15-44 years; -1 point for >=45 years)

#### 2. Management Pathway
* **Score 0-1**: No antibiotic therapy or throat culture required.
* **Score 2-3**: Perform rapid antigen test or throat culture. Treat only if positive.
* **Score 4-5**: Empiric antibiotic therapy (Penicillin V first line) can be considered.

#### 3. Surgical Referral Thresholds
Refer for tonsillectomy if criteria match: 7 episodes in the past year, 5 episodes annually for 2 years, or 3 episodes annually for 3 years.`,

    "vertigo": `### Vestibular Triage Pathway

Use these guidelines to evaluate patients presenting with acute vestibular syndrome (AVS).

#### 1. Peripheral Vestibular Triage (BPPV)
* **Diagnosis**: Dix-Hallpike maneuver triggers transient, crescendo-decrescendo geotropic nystagmus.
* **Treatment**: Epley canalith repositioning maneuver.

#### 2. HINTS Diagnostic Battery
Perform to rule out central stroke in continuous vertigo with nystagmus:
* **Head Impulse Test**: Normal head impulse strongly suggests a central lesion.
* **Nystagmus**: Bidirectional or vertical nystagmus suggests a central lesion.
* **Test of Skew**: Vertical misalignment on alternate cover testing suggests a central lesion.

#### 3. High-Risk Red Flags
Transfer immediately to emergency if any are present:
* Dysarthria, dysphagia, dysphonia, or diplopia (the "4 Ds").
* Acute limb ataxia or profound gait instability (inability to stand unsupported).`
  };

  const DEFAULT_RESPONSE = `### MOH Clinical Guidelines Index

Your query did not match specific diagnostic pathways. Ensure you consult the core guidelines:

#### Core Chapters
1. **Pediatric Otolaryngology**: Otitis media thresholds and tonsillectomy criteria.
2. **Otology & Neurotology**: Peripheral vertigo assessment and HINTS triage protocols.
3. **Rhinology & Sinusitis**: Guidelines on acute rhinosinusitis and antibiotic stewardship.

Please refine your query with key clinical keywords such as "otitis media", "tonsillitis", or "vertigo".`;

  export function getMockResponse(query: string): string {
    const clean = query.toLowerCase();
    if (clean.includes("otitis") || clean.includes("media")) {
      return CLINICAL_RESPONSES["otitis media"];
    }
    if (clean.includes("tonsil") || clean.includes("throat")) {
      return CLINICAL_RESPONSES["tonsil"];
    }
    if (clean.includes("vertigo") || clean.includes("dizzy")) {
      return CLINICAL_RESPONSES["vertigo"];
    }
    return DEFAULT_RESPONSE;
  }

  export function simulateStreaming(
    content: string,
    onChunk: (text: string, isStreaming: boolean) => void
  ) {
    const words = content.split(" ");
    let index = 0;
    let currentText = "";

    const timer = setInterval(() => {
      if (index >= words.length) {
        clearInterval(timer);
        onChunk(content, false);
      } else {
        // Append 2-3 words per iteration to simulate LLM streaming
        const count = Math.min(3, words.length - index);
        const chunk = words.slice(index, index + count).join(" ");
        currentText += (currentText ? " " : "") + chunk;
        index += count;
        onChunk(currentText, true);
      }
    }, 100);

    return () => clearInterval(timer);
  }
  ```

- [ ] **Step 2: Commit simulated streaming utility**
  Run commands:
  ```powershell
  git add lib/streaming.ts
  git commit -m "feat: add simulated clinical guidelines streaming registry"
  ```

---

### Task 4: Sidebar UI Component

**Files:**
- Create: `components/ui/Sidebar.tsx`

- [ ] **Step 1: Write Sidebar Component**
  Create a collapsible sidebar component styled in Neo-brutalist parameters matching the design system specifications.

  ```typescript
  "use client";

  import React from "react";
  import { useUIStore, useChatStore } from "@/lib/store";
  import {
    Plus,
    Menu,
    ChevronLeft,
    Database,
    LogOut,
    User,
    MessageSquare,
    Activity
  } from "lucide-react";

  export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar, activePane, setActivePane } = useUIStore();
    const { conversations, activeConversationId, selectConversation, createNewConversation, syncStatus } = useChatStore();

    const handleNewChat = () => {
      const title = `Consultation ${conversations.length + 1}`;
      createNewConversation(title);
      setActivePane("chat");
    };

    const getStatusStyles = () => {
      switch (syncStatus) {
        case "synced":
          return { bg: "bg-lime-brutal", label: "Synced", border: "border-black" };
        case "syncing":
          return { bg: "bg-yellow-brutal", label: "Syncing", border: "border-black" };
        default:
          return { bg: "bg-pink-brutal", label: "Offline", border: "border-black" };
      }
    };

    const status = getStatusStyles();

    return (
      <aside
        className={`h-full bg-white border-r-[3px] border-black flex flex-col justify-between transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-72"
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b-[3px] border-black flex items-center justify-between bg-yellow-brutal">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-black shrink-0 stroke-[2.5]" />
                <span className="font-display font-extrabold text-lg uppercase tracking-tight">
                  MOH Assist
                </span>
              </div>
            )}
            {sidebarCollapsed && (
              <Activity className="w-6 h-6 text-black mx-auto stroke-[2.5]" />
            )}
            <button
              onClick={toggleSidebar}
              className={`press-effect p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 ${
                sidebarCollapsed ? "mx-auto mt-2" : ""
              }`}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Action: New Chat */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="press-effect w-full border-brutal bg-lime-brutal p-3 font-display font-extrabold uppercase text-sm shadow-brutal flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              {!sidebarCollapsed && <span>New Consult</span>}
            </button>
          </div>

          {/* Search/Filter Title */}
          {!sidebarCollapsed && (
            <div className="px-4 py-2 text-xs font-mono font-bold uppercase text-gray-500 border-b border-black">
              Consultation Logs
            </div>
          )}

          {/* Scrollable Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    if (activePane !== "split") {
                      setActivePane("chat");
                    }
                  }}
                  className={`w-full text-left p-3 border-2 border-black flex items-center gap-3 transition-all duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] ${
                    isActive ? "bg-cyan-brutal" : "bg-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-sm truncate uppercase tracking-tight">
                        {conv.title}
                      </div>
                      <div className="font-mono text-[10px] text-black/60 mt-0.5">
                        {conv.updatedAt}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="border-t-[3px] border-black bg-gray-50 p-2 space-y-2">
          {/* Sync status banner */}
          <div
            className={`border-2 border-black bg-white p-2.5 flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              sidebarCollapsed ? "flex-col" : "flex-row justify-between"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-3 h-3 rounded-full border border-black animate-pulse ${status.bg}`} />
              {!sidebarCollapsed && (
                <span className="font-mono text-[10px] font-bold uppercase truncate">
                  DB: {status.label}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <Database className="w-3.5 h-3.5 text-black/60 shrink-0" />
            )}
          </div>

          {/* User profile card */}
          <div
            className={`border-2 border-black bg-white p-2 flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              sidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-pink-brutal flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                <User className="w-4 h-4 text-black stroke-[2.5]" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="font-display font-black text-xs uppercase truncate">
                    Dr. CA
                  </div>
                  <div className="font-sans text-[10px] font-semibold text-black/50 truncate">
                    ENT Specialist
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                className="press-effect p-1 border border-black hover:bg-gray-100"
                title="Mock Logout"
              >
                <LogOut className="w-3.5 h-3.5 text-black" />
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }
  ```

- [ ] **Step 2: Commit Sidebar component**
  Run commands:
  ```powershell
  git add components/ui/Sidebar.tsx
  git commit -m "feat: implement collapsible Neo-brutalist Sidebar component"
  ```

---

### Task 5: Chat UI Components (Bubble, Input, Panel)

**Files:**
- Create: `components/chat/ChatBubble.tsx`
- Create: `components/chat/ChatInput.tsx`
- Create: `components/chat/ChatPanel.tsx`

- [ ] **Step 1: Write ChatBubble Component**
  Create the component at `components/chat/ChatBubble.tsx`. It parses markdown layout elements (headings, bold, lists) and matches colors.

  ```typescript
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
          // Parse bold text inside list items: **text**
          const parts = line.substring(2).split("**");
          return (
            <li key={idx} className="ml-4 list-disc text-sm font-sans font-medium mb-1 pl-1 text-black/90">
              {parts.map((part, pIdx) =>
                pIdx % 2 === 1 ? <strong key={pIdx} className="font-black text-black">{part}</strong> : part
              )}
            </li>
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
  ```

- [ ] **Step 2: Write ChatInput Component**
  Create the input component at `components/chat/ChatInput.tsx`.
  
  ```typescript
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
  ```

- [ ] **Step 3: Write ChatPanel Component**
  Create the panel wrapper component at `components/chat/ChatPanel.tsx` that links Zustand message histories to chat lists.
  
  ```typescript
  "use client";

  import React, { useRef, useEffect } from "react";
  import { useChatStore } from "@/lib/store";
  import { getMockResponse, simulateStreaming } from "@/lib/streaming";
  import ChatBubble from "./ChatBubble";
  import ChatInput from "./ChatInput";
  import { BookOpen } from "lucide-react";

  export default function ChatPanel() {
    const { activeConversationId, messages, addMessage, updateLastMessage, setSyncStatus } = useChatStore();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
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
  ```

- [ ] **Step 4: Commit Chat panel and components**
  Run commands:
  ```powershell
  git add components/chat/ChatBubble.tsx components/chat/ChatInput.tsx components/chat/ChatPanel.tsx
  git commit -m "feat: implement ChatPanel, ChatBubble, and ChatInput components"
  ```

---

### Task 6: Chat Dashboard Page

**Files:**
- Create: `app/chat/page.tsx`

- [ ] **Step 1: Write Chat Dashboard Screen**
  Create the Next.js page at `app/chat/page.tsx` that links the collapsible Sidebar, the ChatPanel, and the mockup Mind Map panel.

  ```typescript
  "use client";

  import React from "react";
  import Sidebar from "@/components/ui/Sidebar";
  import ChatPanel from "@/components/chat/ChatPanel";
  import { useUIStore } from "@/lib/store";
  import { Network, HelpCircle, GitFork } from "lucide-react";

  export default function ChatPage() {
    const { activePane, setActivePane } = useUIStore();

    return (
      <div className="h-screen w-screen overflow-hidden flex bg-[#F3F4F6] text-black">
        {/* Sidebar */}
        <Sidebar />

        {/* Workspace Shell */}
        <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          
          {/* Mobile responsive toggle header (hidden on desktop) */}
          <div className="lg:hidden border-b-[3px] border-black bg-white p-3 flex justify-around shrink-0 bg-yellow-brutal">
            <button
              onClick={() => setActivePane("chat")}
              className={`press-effect px-4 py-2 border-2 border-black font-display font-extrabold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                activePane === "chat" ? "bg-lime-brutal" : "bg-white"
              }`}
            >
              Guidelines Chat
            </button>
            <button
              onClick={() => setActivePane("mindmap")}
              className={`press-effect px-4 py-2 border-2 border-black font-display font-extrabold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                activePane === "mindmap" ? "bg-lime-brutal" : "bg-white"
              }`}
            >
              Mind Map (Mock)
            </button>
          </div>

          {/* Side-by-Side Panels Grid */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* Chat Pane (Left 40% on desktop) */}
            <div
              className={`h-full min-w-0 border-r-[3px] border-black lg:w-[40%] flex flex-col shrink-0 ${
                activePane === "chat" || activePane === "split" ? "flex" : "hidden lg:flex"
              }`}
            >
              <ChatPanel />
            </div>

            {/* Mind Map Pane (Right 60% on desktop) */}
            <div
              className={`h-full flex-1 flex flex-col min-w-0 overflow-hidden ${
                activePane === "mindmap" || activePane === "split" ? "flex" : "hidden lg:flex"
              }`}
            >
              {/* Mock Mind Map Placeholder */}
              <div className="flex-1 flex flex-col h-full bg-[#E5E7EB] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] p-6 justify-center items-center">
                <div className="border-brutal-thick bg-white p-8 max-w-lg shadow-brutal-lg space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full border-3 border-black bg-pink-brutal flex items-center justify-center mx-auto shadow-brutal">
                    <Network className="w-8 h-8 text-black stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="font-display font-black text-2xl uppercase tracking-wide">
                      Interactive Clinical Mind Map
                    </h2>
                    <p className="font-sans text-sm font-semibold text-black/60 leading-relaxed">
                      A visual workspace to organize diagnoses, diagnostic assessments, and treatment pathways. Powered by **React Flow** under final implementation phases.
                    </p>
                  </div>

                  <div className="border-2 border-black bg-yellow-brutal/10 p-4 font-sans text-xs font-bold text-left flex gap-3">
                    <GitFork className="w-6 h-6 text-yellow-brutal shrink-0 stroke-[2.5]" />
                    <div>
                      <span className="uppercase text-black block mb-0.5">Integration Pending:</span>
                      Brainstorming and diagnostics maps generated dynamically in Supabase Edge Functions will load in this area as node pathways.
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button className="press-effect border-2 border-black bg-lime-brutal px-4 py-2 font-display font-extrabold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit Page route implementation**
  Run commands:
  ```powershell
  git add app/chat/page.tsx
  git commit -m "feat: add Next.js /chat route binding layouts and mindmap placeholders"
  ```

---

### Task 7: Entry Redirect

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update Home Page to Redirect**
  Modify the root route at `app/page.tsx` to automatically redirect users to `/chat` or provide a primary entry gate. Since we want a robust routing shell, we will replace the verification dashboard with a beautiful landing intro that redirects to `/chat`.

  ```typescript
  "use client";

  import React from "react";
  import Link from "next/link";
  import { ArrowRight, ShieldCheck, Heart } from "lucide-react";

  export default function Home() {
    return (
      <div className="min-h-screen bg-[#F3F4F6] text-black font-sans py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="max-w-xl w-full border-brutal-thick bg-yellow-brutal p-8 shadow-brutal-lg space-y-6 text-center">
          <header className="space-y-2">
            <div className="w-16 h-16 rounded-full border-3 border-black bg-lime-brutal flex items-center justify-center mx-auto shadow-brutal mb-4">
              <ShieldCheck className="w-9 h-9 text-black stroke-[2.5]" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
              MOH Guidelines Assistant
            </h1>
            <p className="font-sans text-sm font-semibold text-black/70 leading-relaxed max-w-sm mx-auto">
              Clinical decision RAG assistant and diagnostics planner for Egyptian healthcare practitioners.
            </p>
          </header>

          <div className="pt-2">
            <Link
              href="/chat"
              className="press-effect w-full border-brutal bg-white p-4 font-display font-extrabold uppercase text-base shadow-brutal flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
            >
              <span>Launch Clinician Dashboard</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </Link>
          </div>

          <footer className="pt-4 border-t-2 border-black flex items-center justify-center gap-1.5 font-sans text-xs font-bold text-black/55 uppercase tracking-wide">
            Made for Doctors with <Heart className="w-3.5 h-3.5 text-pink-brutal fill-pink-brutal" /> in Egypt
          </footer>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit Home page update**
  Run commands:
  ```powershell
  git add app/page.tsx
  git commit -m "refactor: redirect home page to dashboard workspace"
  ```

---

### Task 8: Verification & Compilation Check

**Files:**
- None (verification only)

- [ ] **Step 1: Run linter verification**
  Run command:
  ```powershell
  npm run lint
  ```
  Expected Output: Build linter completes with zero syntax or typescript warnings.

- [ ] **Step 2: Run typescript compilation check**
  Run command:
  ```powershell
  npm run typecheck
  ```
  Expected Output: Complete success without errors.
