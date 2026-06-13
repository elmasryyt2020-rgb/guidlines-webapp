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
