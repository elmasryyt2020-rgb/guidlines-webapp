"use client";

import React from "react";
import { useMindMapStore } from "@/lib/mindmapStore";
import { RefreshCw, Trash2, Save } from "lucide-react";

export default function MindMapToolbar() {
  const { regenerateMap, clearMap, saveLayout } = useMindMapStore();

  return (
    <div className="w-full bg-white border-b-[3px] border-black p-3 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 border-2 border-black rounded-none"></div>
        <span className="font-display font-black text-xs uppercase tracking-wider text-black">
          Clinical Map Workspace
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={regenerateMap}
          className="press-effect border-[3px] border-black bg-yellow-brutal hover:bg-yellow-400 px-3 py-1.5 font-display font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
          Regenerate
        </button>
        
        <button
          onClick={clearMap}
          className="press-effect border-[3px] border-black bg-pink-brutal hover:bg-pink-400 px-3 py-1.5 font-display font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          Clear
        </button>
        
        <button
          onClick={saveLayout}
          className="press-effect border-[3px] border-black bg-lime-brutal hover:bg-lime-400 px-3 py-1.5 font-display font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
          Save Layout
        </button>
      </div>
    </div>
  );
}
