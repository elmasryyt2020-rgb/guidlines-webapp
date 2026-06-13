"use client";

import React, { useEffect } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant
} from "@xyflow/react";
import { useMindMapStore } from "@/lib/mindmapStore";
import { nodeTypes } from "./CustomNodes";
import MindMapToolbar from "./MindMapToolbar";
import RecommendationDrawer from "./RecommendationDrawer";

// Styles import
import "@xyflow/react/dist/style.css";

function CanvasContainer() {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    selectNode,
    toastMessage,
    clearToast
  } = useMindMapStore();

  // Show a basic console alert or banner for toast changes
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F3F4F6]">
      {/* Toolbar */}
      <MindMapToolbar />

      {/* React Flow Core */}
      <div className="flex-1 min-w-0 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => selectNode(node.id)}
          fitView
          minZoom={0.5}
          maxZoom={2.5}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background variant={BackgroundVariant.Dots} color="#000" gap={20} size={1} />
          <Controls className="!border-2 !border-black !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] !rounded-none !bg-white" />
          <MiniMap 
            className="!border-2 !border-black !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] !rounded-none !bg-white"
            nodeColor={(node) => {
              if (node.type === "symptomNode") return "#FACC15";
              if (node.type === "diagnosisNode") return "#D946EF";
              if (node.type === "testNode") return "#06B6D4";
              if (node.type === "treatmentNode") return "#A3E635";
              return "#fff";
            }}
          />
        </ReactFlow>

        {/* Guidelines Details Drawer Overlay */}
        <RecommendationDrawer />
      </div>

      {/* Neo-brutalist Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-6 left-6 z-50 border-[3px] border-black bg-[#A3E635] px-4 py-2 font-display font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce text-black">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContainer />
    </ReactFlowProvider>
  );
}
