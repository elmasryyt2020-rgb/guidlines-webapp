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
            {/* Mock Mind Map Placeholder */}
            <div className="flex-1 flex flex-col h-full bg-[#E5E7EB] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] p-6 justify-center items-center">
              <div className="border-brutal-thick bg-white p-8 max-w-lg shadow-brutal-lg space-y-6 text-center">
                <div className="w-16 h-16 rounded-full border-[3px] border-black bg-pink-brutal flex items-center justify-center mx-auto shadow-brutal">
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
