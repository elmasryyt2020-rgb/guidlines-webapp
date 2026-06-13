"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/lib/store";
import { useMindMapStore } from "@/lib/mindmapStore";
import { X, Sparkles, BookOpen, Layers } from "lucide-react";

export default function RecommendationDrawer() {
  const { getToken } = useAuth();
  const { activeConversationId } = useChatStore();
  const { selectedNode, drawerOpen, closeDrawer, brainstormOnNode } = useMindMapStore();

  if (!drawerOpen || !selectedNode) return null;

  const data = selectedNode.data;
  const typeLabel = selectedNode.type
    ? selectedNode.type.replace("Node", "")
    : "Parameter";

  return (
    <div className="absolute top-0 right-0 h-full w-[350px] sm:w-[400px] bg-white border-l-[3px] border-black z-50 flex flex-col shadow-[-4px_0px_0px_0px_rgba(0,0,0,1)]">
      {/* Drawer Header */}
      <div className="p-4 border-b-[3px] border-black flex justify-between items-center bg-yellow-brutal shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-black stroke-[2.5]" />
          <div className="font-display font-black text-xs uppercase tracking-wider bg-white px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            {typeLabel}
          </div>
        </div>
        <button
          onClick={closeDrawer}
          className="p-1 border-[2.5px] border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 font-sans">
        <div>
          <h3 className="font-display font-black text-xl text-black uppercase leading-tight mb-2">
            {data.label}
          </h3>
          <p className="text-sm text-black/70 font-semibold leading-relaxed">
            {data.description}
          </p>
        </div>

        <hr className="border-t-[2.5px] border-black" />

        {/* Clinical Recommendations */}
        <div className="space-y-3">
          <h4 className="font-display font-black text-xs uppercase tracking-wider text-black/55">
            Clinical Guidelines Recommendations
          </h4>
          <ul className="space-y-3">
            {data.recommendations.map((rec, index) => (
              <li
                key={index}
                className="bg-slate-50 border-2 border-black p-3 text-xs font-semibold text-black leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* Official Citations */}
        {data.citations && data.citations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-display font-black text-xs uppercase tracking-wider text-black/55 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" /> Guidelines Citation
            </h4>
            {data.citations.map((cite, index) => (
              <div
                key={index}
                className="bg-lime-brutal/10 border-2 border-black p-3.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2 text-xs font-semibold"
              >
                <span className="font-display font-black uppercase text-[10px] tracking-wider text-emerald-800 block">
                  {cite.document} - {cite.section}
                </span>
                <p className="text-black italic leading-normal">
                  &ldquo;{cite.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-4 border-t-[3px] border-black bg-slate-50 shrink-0">
        <button
          onClick={() => {
            if (activeConversationId) {
              brainstormOnNode(activeConversationId, selectedNode.id, getToken);
            }
          }}
          disabled={!activeConversationId}
          className="w-full press-effect border-[3px] border-black bg-pink-brutal hover:bg-pink-400 py-3 font-display font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:pointer-events-none"
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          Brainstorm on this
        </button>
      </div>
    </div>
  );
}
