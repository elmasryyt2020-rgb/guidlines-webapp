"use client";

import React from "react";
import Sidebar from "@/components/ui/Sidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import { useUIStore } from "@/lib/store";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

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
            Clinical Mind Map
          </button>
        </div>

        {/* Side-by-Side Panels Grid */}
        <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">
          {/* Chat Pane (Left 40% on desktop) */}
          <div
            className={`h-full w-full min-w-0 border-r-[3px] border-black lg:w-[40%] flex flex-col shrink-0 ${
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
            <MindMapCanvas />
          </div>
        </div>
      </main>
    </div>
  );
}
