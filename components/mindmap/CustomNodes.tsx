"use client";

import React from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { ClinicalNodeData } from "@/lib/mindmapStore";
import { HelpCircle, Stethoscope, ClipboardCheck, Activity } from "lucide-react";

const nodeBaseStyle = "px-4 py-3 border-[3px] border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black min-w-[200px] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] bg-white";

export const SymptomNode = ({ data }: NodeProps<Node<ClinicalNodeData>>) => {
  return (
    <div className={`${nodeBaseStyle} bg-[#FACC15]`}>
      <div className="flex items-center gap-2 border-b-2 border-black pb-1.5 mb-1.5">
        <HelpCircle className="w-4 h-4 stroke-[2.5]" />
        <span className="font-display font-black text-xs uppercase tracking-wider">Symptom</span>
      </div>
      <div className="font-sans font-bold text-sm leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
};

export const DiagnosisNode = ({ data }: NodeProps<Node<ClinicalNodeData>>) => {
  return (
    <div className={`${nodeBaseStyle} bg-[#D946EF]`}>
      <Handle type="target" position={Position.Left} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 border-b-2 border-black pb-1.5 mb-1.5">
        <Stethoscope className="w-4 h-4 stroke-[2.5]" />
        <span className="font-display font-black text-xs uppercase tracking-wider">Differential</span>
      </div>
      <div className="font-sans font-bold text-sm leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
};

export const TestNode = ({ data }: NodeProps<Node<ClinicalNodeData>>) => {
  return (
    <div className={`${nodeBaseStyle} bg-[#06B6D4]`}>
      <Handle type="target" position={Position.Left} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 border-b-2 border-black pb-1.5 mb-1.5">
        <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
        <span className="font-display font-black text-xs uppercase tracking-wider">Diagnostic Test</span>
      </div>
      <div className="font-sans font-bold text-sm leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
};

export const TreatmentNode = ({ data }: NodeProps<Node<ClinicalNodeData>>) => {
  return (
    <div className={`${nodeBaseStyle} bg-[#A3E635]`}>
      <Handle type="target" position={Position.Left} className="!bg-black !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 border-b-2 border-black pb-1.5 mb-1.5">
        <Activity className="w-4 h-4 stroke-[2.5]" />
        <span className="font-display font-black text-xs uppercase tracking-wider">Treatment Plan</span>
      </div>
      <div className="font-sans font-bold text-sm leading-snug">{data.label}</div>
    </div>
  );
};

export const nodeTypes = {
  symptomNode: SymptomNode,
  diagnosisNode: DiagnosisNode,
  testNode: TestNode,
  treatmentNode: TreatmentNode,
};
