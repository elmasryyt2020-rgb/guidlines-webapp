"use client";

import React from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import ProfileModal from "@/components/auth/ProfileModal";
import { useUIStore, useChatStore } from "@/lib/store";
import {
  Plus,
  Menu,
  ChevronLeft,
  Database,
  MessageSquare,
  Activity
} from "lucide-react";

export default function Sidebar() {
  const { user } = useSupabaseSession();
  const userId = user?.id ?? null;
  const { sidebarCollapsed, toggleSidebar, activePane, setActivePane } = useUIStore();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const { conversations, draftConversation, activeConversationId, selectConversation, startDraftConversation, syncStatus } = useChatStore();

  const handleNewChat = () => {
    startDraftConversation();
    setActivePane("chat");
  };

  const getStatusStyles = () => {
    switch (syncStatus) {
      case "synced":
        return { bg: "bg-lime-brutal", label: "Synced" };
      case "syncing":
        return { bg: "bg-yellow-brutal", label: "Syncing" };
      default:
        return { bg: "bg-pink-brutal", label: "Offline" };
    }
  };

  const status = getStatusStyles();

  const firstInitial = user?.user_metadata?.first_name?.[0] || "";
  const lastInitial = user?.user_metadata?.last_name?.[0] || "";
  const initials = firstInitial && lastInitial
    ? `${firstInitial}${lastInitial}`.toUpperCase()
    : (user?.email || "DR").slice(0, 2).toUpperCase();

  return (
    <aside
      className={`h-full bg-white border-r-[3px] border-black flex flex-col justify-between transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-72"
        }`}
    >
      {/* Top Header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className={`border-b-[3px] border-black flex items-center bg-yellow-brutal shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? "px-2 py-[11px] justify-center h-[73px]" : "p-4 justify-between h-[73px]"
          }`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-black shrink-0 stroke-[2.5]" />
              <span className="font-display font-extrabold text-lg uppercase tracking-tight">
                MOH Assist
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`press-effect bg-white hover:bg-gray-100 border-brutal shadow-brutal flex items-center justify-center cursor-pointer transition-all duration-300 ${
              sidebarCollapsed ? "w-full h-full" : "p-2"
            }`}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Quick Action: New Chat */}
        <div className={sidebarCollapsed ? "px-2 pt-2 pb-0" : "p-3"}>
          <button
            onClick={handleNewChat}
            disabled={!userId}
            className={`press-effect w-full border-brutal bg-lime-brutal font-display font-extrabold uppercase text-sm shadow-brutal flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:pointer-events-none ${sidebarCollapsed ? "aspect-square p-0" : "p-3"
              }`}
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
        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2 space-y-2">
          {(draftConversation ? [draftConversation, ...conversations] : conversations).map((conv) => {
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
                className={`w-full text-left p-3 border-2 border-black flex items-center gap-3 transition-all duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none ${isActive ? "bg-cyan-brutal" : "bg-white"
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
      <div className="border-t-[3px] border-black bg-gray-50 p-2 flex flex-col justify-between shrink-0 h-[120px]">
        {/* Sync status banner */}
        <div
          className={`border-brutal bg-white p-2.5 flex items-center justify-center gap-2 shadow-brutal ${sidebarCollapsed ? "flex-col" : "flex-row justify-between"
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
        {sidebarCollapsed ? (
          <button
            onClick={() => setIsProfileOpen(true)}
            className="press-effect w-full aspect-square p-0 border-brutal bg-cyan-brutal font-display font-black text-xs uppercase shadow-brutal flex items-center justify-center cursor-pointer"
          >
            {initials}
          </button>
        ) : (
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-full border-brutal bg-white p-2 flex items-center justify-between shadow-brutal active:shadow-none press-effect text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0 w-full">
              <div className="shrink-0">
                <div className="w-9 h-9 border-[3px] border-black bg-cyan-brutal flex items-center justify-center font-display font-black text-xs uppercase text-black">
                  {initials}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-black text-xs uppercase truncate text-black">
                  {user?.user_metadata?.full_name || "Clinician"}
                </div>
                <div className="font-sans text-[10px] font-semibold text-black/50 truncate">
                  {user?.user_metadata?.specialty || "ENT Specialist"}
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </aside>
  );
}
