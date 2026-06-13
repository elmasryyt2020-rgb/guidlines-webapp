# Interactive Mind Map UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive, responsive visual mind map using React Flow in the right-hand panel of the Clinical Guidelines Assistant, utilizing client-side mock data, custom Neo-brutalist nodes, and dynamic brainstorm appending.

**Architecture:** We use `@xyflow/react` (v12) for rendering the canvas nodes and edges. Canvas state is fully managed by a Zustand store (`lib/mindmapStore.ts`), which handles layout mutations (panning, zoom, node additions, clearing). A slide-out panel (`components/mindmap/RecommendationDrawer.tsx`) listens to store selections to present detailed Egyptian Ministry of Health (MOH) guideline suggestions.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS, Zustand, @xyflow/react, Lucide React

---

## Proposed Changes

We will modify or create the following files:
*   [NEW] `lib/mindmapStore.ts` — Zustand store for nodes, edges, selection, and brainstorming logic.
*   [NEW] `components/mindmap/CustomNodes.tsx` — Custom Neo-brutalist node components for Symptom, Diagnosis, Test, and Treatment types.
*   [NEW] `components/mindmap/RecommendationDrawer.tsx` — Slide-out detailed clinical recommendations panel.
*   [NEW] `components/mindmap/MindMapToolbar.tsx` — Canvas toolbar for clearing, regenerating, and saving maps.
*   [NEW] `components/mindmap/MindMapCanvas.tsx` — Outer React Flow canvas wrapper component.
*   [MODIFY] `app/chat/page.tsx` — Swapping the mock mindmap placeholder for `MindMapCanvas` and rendering the drawer and toolbar.

---

## Tasks

### Task 1: Install React Flow Dependency
**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `@xyflow/react` package**
  Run: `npm install @xyflow/react`
  Verify that `@xyflow/react` is successfully added to the dependencies in `package.json`.

- [ ] **Step 2: Commit installation changes**
  Run:
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: install @xyflow/react for React 19 compatibility"
  ```

---

### Task 2: Create Zustand Mind Map Store
**Files:**
- Create: `lib/mindmapStore.ts`

- [ ] **Step 1: Write the store logic**
  Implement the Zustand store in `lib/mindmapStore.ts` with initial Vertigo triage nodes, edges, and actions:
  
  ```typescript
  "use client";

  import { create } from "zustand";
  import { 
    Node, 
    Edge, 
    NodeChange, 
    EdgeChange, 
    applyNodeChanges, 
    applyEdgeChanges 
  } from "@xyflow/react";

  export type NodeType = "symptom" | "diagnosis" | "test" | "treatment";

  export interface GuidelineCitation {
    document: string;
    section: string;
    text: string;
  }

  export interface ClinicalNodeData extends Record<string, unknown> {
    label: string;
    description: string;
    recommendations: string[];
    citations: GuidelineCitation[];
  }

  export interface MindMapState {
    nodes: Node<ClinicalNodeData>[];
    edges: Edge[];
    selectedNode: Node<ClinicalNodeData> | null;
    drawerOpen: boolean;
    toastMessage: string | null;
    
    // Canvas event handlers
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    
    // Actions
    selectNode: (nodeId: string) => void;
    closeDrawer: () => void;
    brainstormOnNode: (nodeId: string) => void;
    regenerateMap: () => void;
    clearMap: () => void;
    saveLayout: () => void;
    clearToast: () => void;
  }

  const INITIAL_NODES: Node<ClinicalNodeData>[] = [
    {
      id: "vertigo-symptom",
      type: "symptomNode",
      position: { x: 50, y: 180 },
      data: {
        label: "Acute Vertigo Presentation",
        description: "Patient complains of new onset dizziness, spinning sensation, and gait imbalance.",
        recommendations: [
          "Evaluate core stability and gauge if onset was sudden or gradual.",
          "Check for accompanying auditory, ocular, or neurologic symptoms.",
          "Check vital signs immediately to rule out orthostatic hypotension."
        ],
        citations: [
          {
            document: "Egyptian Ministry of Health ENT Guideline (2024)",
            section: "Section 2.1: Otology and Vestibular Triage",
            text: "Initial patient assessment for vertigo must prioritize neurological screening before localized vestibular tests."
          }
        ]
      }
    },
    {
      id: "vertigo-diag-bppv",
      type: "diagnosisNode",
      position: { x: 320, y: 50 },
      data: {
        label: "BPPV",
        description: "Benign Paroxysmal Positional Vertigo - usually canalithiasis of the posterior semicircular canal.",
        recommendations: [
          "Perform diagnostic Dix-Hallpike maneuver.",
          "Counsel patient on the benign, episodic nature of BPPV.",
          "Avoid prescribing vestibular suppressants for BPPV, as they delay adaptation."
        ],
        citations: [
          {
            document: "Egyptian National Clinical Protocol for Vertigo",
            section: "Part B: BPPV Diagnostic Standards",
            text: "Pharmacotherapy is not recommended for BPPV. Manual canalith repositioning maneuvers are the primary corrective approach."
          }
        ]
      }
    },
    {
      id: "vertigo-diag-neuritis",
      type: "diagnosisNode",
      position: { x: 320, y: 310 },
      data: {
        label: "Vestibular Neuritis",
        description: "Acute vestibular syndrome characterized by persistent spinning dizziness and horizontal nystagmus.",
        recommendations: [
          "Distinguish from stroke using the HINTS exam.",
          "Consider a short course of corticosteroids if presenting within 3 days of onset.",
          "Prescribe short-term vestibular suppressants (max 72 hours) for acute distress."
        ],
        citations: [
          {
            document: "Egyptian Ministry of Health ENT Guideline (2024)",
            section: "Section 2.4: Acute Vestibular Syndrome Management",
            text: "Corticosteroids may improve recovery of peripheral vestibular function if started within 72 hours."
          }
        ]
      }
    },
    {
      id: "vertigo-test-dix",
      type: "testNode",
      position: { x: 580, y: 50 },
      data: {
        label: "Dix-Hallpike Test",
        description: "Gold standard diagnostic maneuver for posterior canal BPPV.",
        recommendations: [
          "Rotate patient's head 45 degrees, then rapidly lower them to a supine position with head extended 20 degrees.",
          "Observe eyes for nystagmus (typical latency of 2-15 seconds, fatigues with repetition).",
          "Ensure safety precautions: hold patient firmly during transition."
        ],
        citations: [
          {
            document: "Egyptian National Clinical Protocol for Vertigo",
            section: "Appendix III: Maneuver Guides",
            text: "A positive Dix-Hallpike maneuver is diagnostic of posterior canal BPPV, characterized by upbeat, torsional nystagmus."
          }
        ]
      }
    },
    {
      id: "vertigo-test-hints",
      type: "testNode",
      position: { x: 580, y: 310 },
      data: {
        label: "HINTS Assessment",
        description: "Three-part bedside ocular motor assessment: Head Impulse, Nystagmus, Test of Skew.",
        recommendations: [
          "Check Head Impulse Test (HIT): corrective saccade indicates peripheral cause.",
          "Assess nystagmus: direction-changing horizontal or vertical nystagmus suggests central cause.",
          "Perform Test of Skew: vertical misalignment indicates central brainstem cause."
        ],
        citations: [
          {
            document: "Egyptian Ministry of Health ENT Guideline (2024)",
            section: "Section 2.2: Central Triage Rules",
            text: "HINTS exam has higher sensitivity than early MRI for detecting cerebellar stroke in acute vestibular syndrome."
          }
        ]
      }
    },
    {
      id: "vertigo-treat-epley",
      type: "treatmentNode",
      position: { x: 840, y: 50 },
      data: {
        label: "Epley Maneuver",
        description: "Canalith repositioning procedure to treat posterior canal BPPV.",
        recommendations: [
          "Perform sequentially: turn head 45° to affected side, drop supine, rotate 90° to opposite side, roll onto shoulder, sit up.",
          "Hold each position for 30-60 seconds or until nystagmus resolves.",
          "Verify resolution of symptoms with follow-up Dix-Hallpike."
        ],
        citations: [
          {
            document: "Egyptian National Clinical Protocol for Vertigo",
            section: "Part B: BPPV Treatment Steps",
            text: "Epley maneuver is highly effective in clearing posterior canal canaliths, resolving symptoms in up to 90% of cases after 1-2 sessions."
          }
        ]
      }
    },
    {
      id: "vertigo-treat-rehab",
      type: "treatmentNode",
      position: { x: 840, y: 310 },
      data: {
        label: "Vestibular Rehab Plan",
        description: "Physical therapy exercises designed to facilitate central vestibular compensation.",
        recommendations: [
          "Start gaze stabilization exercises (VOR x1 and VOR x2) twice daily.",
          "Implement balance training: standing on foam surfaces, narrow base of support.",
          "Gradually increase walking activity with head turns."
        ],
        citations: [
          {
            document: "Egyptian Ministry of Health ENT Guideline (2024)",
            section: "Section 2.5: Vestibular Rehabilitation",
            text: "Early referral to vestibular rehabilitation therapy significantly accelerates recovery times and reduces falls in patients with vestibular neuritis."
          }
        ]
      }
    }
  ];

  const INITIAL_EDGES: Edge[] = [
    { id: "e-symptom-bppv", source: "vertigo-symptom", target: "vertigo-diag-bppv", style: { strokeWidth: 3, stroke: "#000" } },
    { id: "e-symptom-neuritis", source: "vertigo-symptom", target: "vertigo-diag-neuritis", style: { strokeWidth: 3, stroke: "#000" } },
    { id: "e-bppv-dix", source: "vertigo-diag-bppv", target: "vertigo-test-dix", style: { strokeWidth: 3, stroke: "#000" } },
    { id: "e-neuritis-hints", source: "vertigo-diag-neuritis", target: "vertigo-test-hints", style: { strokeWidth: 3, stroke: "#000" } },
    { id: "e-dix-epley", source: "vertigo-test-dix", target: "vertigo-treat-epley", style: { strokeWidth: 3, stroke: "#000" } },
    { id: "e-hints-rehab", source: "vertigo-test-hints", target: "vertigo-treat-rehab", style: { strokeWidth: 3, stroke: "#000" } }
  ];

  export const useMindMapStore = create<MindMapState>((set, get) => ({
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
    selectedNode: null,
    drawerOpen: false,
    toastMessage: null,

    onNodesChange: (changes) => {
      set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
      set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    selectNode: (nodeId) => {
      const node = get().nodes.find((n) => n.id === nodeId);
      if (node) {
        set({ selectedNode: node, drawerOpen: true });
      }
    },

    closeDrawer: () => {
      set({ drawerOpen: false, selectedNode: null });
    },

    brainstormOnNode: (nodeId) => {
      const parentNode = get().nodes.find((n) => n.id === nodeId);
      if (!parentNode) return;

      const baseId = `brainstorm-${Date.now()}`;
      
      // Determine what children to add based on type of selected node
      let childType: NodeType = "test";
      let nodeColorClass = "testNode";
      let childLabel = "Additional Diagnostic Check";
      let childDesc = "Brainstormed assessment parameter.";
      let childRecs = ["MOH Assessment Checklist detail.", "Perform clinical verification."];

      if (parentNode.type?.includes("symptom")) {
        childType = "diagnosis";
        nodeColorClass = "diagnosisNode";
        childLabel = "Labyrinthitis Differential";
        childDesc = "Differential diagnosis for sensory hearing loss combined with vertigo.";
        childRecs = [
          "Perform pure tone audiometry to screen for high frequency hearing loss.",
          "Rule out suppurative otitis media with otoscopic inspection."
        ];
      } else if (parentNode.type?.includes("diagnosis")) {
        childType = "test";
        nodeColorClass = "testNode";
        childLabel = "Caloric Reflex Testing";
        childDesc = "Oculomotor assessment via warm/cool water irrigation.";
        childRecs = [
          "Perform video-nystagmography (VNG) caloric stimulation.",
          "Observe COWS rule: Cold Opposite, Warm Same."
        ];
      } else if (parentNode.type?.includes("test")) {
        childType = "treatment";
        nodeColorClass = "treatmentNode";
        childLabel = "Semont Repositioning";
        childDesc = "Rapid side-lying maneuver for posterior semicircular canalolithiasis.";
        childRecs = [
          "Swing patient from one lateral position to the opposite lateral position in one rapid arc.",
          "Hold terminal posture for 2-3 minutes before returning to upright position."
        ];
      } else if (parentNode.type?.includes("treatment")) {
        childType = "treatment";
        nodeColorClass = "treatmentNode";
        childLabel = "Advanced Vestibular Conditioning";
        childDesc = "Dynamic equilibrium training targeting high-performance gait recovery.";
        childRecs = [
          "Introduce complex gait patterns (turn-about steps, secondary cognitive tasks).",
          "Ensure clinical supervision during initial sessions."
        ];
      }

      // Compute position
      const childNodeX = parentNode.position.x + 250;
      const childNodeY = parentNode.position.y + 60; // offset slightly down

      const newNode: Node<ClinicalNodeData> = {
        id: baseId,
        type: nodeColorClass,
        position: { x: childNodeX, y: childNodeY },
        data: {
          label: childLabel,
          description: childDesc,
          recommendations: childRecs,
          citations: [
            {
              document: "Egyptian Ministry of Health ENT Guideline (2024)",
              section: `Section Brainstorm: ${childLabel}`,
              text: `Clinical addition added dynamically via doctor brainstorm request. Follow official guidelines for patient verification.`
            }
          ]
        }
      };

      const newEdge: Edge = {
        id: `edge-${parentNode.id}-${newNode.id}`,
        source: parentNode.id,
        target: newNode.id,
        style: { strokeWidth: 3, stroke: "#000" }
      };

      // Append to nodes and edges, then update selectedNode to display the new child node recommendations
      set({
        nodes: [...get().nodes, newNode],
        edges: [...get().edges, newEdge],
        selectedNode: newNode, // focus the side panel on the newly added item!
        toastMessage: `Added node: ${childLabel}`
      });
    },

    regenerateMap: () => {
      set({
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        selectedNode: null,
        drawerOpen: false,
        toastMessage: "Map restored to initial Vertigo Triage layout."
      });
    },

    clearMap: () => {
      set({
        nodes: [],
        edges: [],
        selectedNode: null,
        drawerOpen: false,
        toastMessage: "Map cleared."
      });
    },

    saveLayout: () => {
      set({
        toastMessage: "Layout saved successfully to database schema (Mocked)."
      });
    },

    clearToast: () => set({ toastMessage: null })
  }));
  ```

- [ ] **Step 2: Commit store changes**
  Run:
  ```bash
  git add lib/mindmapStore.ts
  git commit -m "feat: add Zustand store for React Flow Mind Map state and actions"
  ```

---

### Task 3: Create Custom Nodes Component
**Files:**
- Create: `components/mindmap/CustomNodes.tsx`

- [ ] **Step 1: Write CustomNodes React component**
  Write custom styled nodes using `@xyflow/react` and tailwind. These render custom handles on left and right, thick borders, and flat solid shadows matching the Neo-brutalist spec:
  
  ```typescript
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
  ```

- [ ] **Step 2: Commit CustomNodes changes**
  Run:
  ```bash
  git add components/mindmap/CustomNodes.tsx
  git commit -m "feat: implement CustomNodes with thick black borders, colors, and shadows"
  ```

---

### Task 4: Create Mind Map Toolbar
**Files:**
- Create: `components/mindmap/MindMapToolbar.tsx`

- [ ] **Step 1: Write the MindMapToolbar React component**
  Build a top action bar styled with Neo-brutalist buttons that translate on hover and click:
  
  ```typescript
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
  ```

- [ ] **Step 2: Commit toolbar changes**
  Run:
  ```bash
  git add components/mindmap/MindMapToolbar.tsx
  git commit -m "feat: create MindMapToolbar component with Neo-brutalist styled buttons"
  ```

---

### Task 5: Create Recommendation Drawer
**Files:**
- Create: `components/mindmap/RecommendationDrawer.tsx`

- [ ] **Step 1: Write the RecommendationDrawer component**
  Write a slide-out drawer panel that shows detailed suggestions and official Egyptian Ministry of Health citations. Includes the "Brainstorm on this" button:
  
  ```typescript
  "use client";

  import React from "react";
  import { useMindMapStore } from "@/lib/mindmapStore";
  import { X, Sparkles, BookOpen, Layers } from "lucide-react";

  export default function RecommendationDrawer() {
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
            className="p-1 border-[2.5px] border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 active:translate-x-0 active:translate-y-0 active:shadow-none"
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
                    "{cite.text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t-[3px] border-black bg-slate-50 shrink-0">
          <button
            onClick={() => brainstormOnNode(selectedNode.id)}
            className="w-full press-effect border-[3px] border-black bg-pink-brutal hover:bg-pink-400 py-3 font-display font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            Brainstorm on this
          </button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit RecommendationDrawer changes**
  Run:
  ```bash
  git add components/mindmap/RecommendationDrawer.tsx
  git commit -m "feat: create RecommendationDrawer component for displaying citations and trigger brainstorms"
  ```

---

### Task 6: Create Mind Map Canvas Wrapper
**Files:**
- Create: `components/mindmap/MindMapCanvas.tsx`

- [ ] **Step 1: Write the MindMapCanvas component**
  Wrap React Flow with custom node registration, background grids, custom connection lines, and coordinate selections:
  
  ```typescript
  "use client";

  import React, { useEffect } from "react";
  import { 
    ReactFlow, 
    Background, 
    Controls, 
    MiniMap,
    ReactFlowProvider
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
            <Background variant="dots" color="#000" gap={20} size={1} />
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
  ```

- [ ] **Step 2: Commit MindMapCanvas changes**
  Run:
  ```bash
  git add components/mindmap/MindMapCanvas.tsx
  git commit -m "feat: complete MindMapCanvas wrapper with canvas controls and grid backgrounds"
  ```

---

### Task 7: Integrate Canvas in Layout
**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: Swap out placeholder block for MindMapCanvas**
  Open `app/chat/page.tsx` and import `MindMapCanvas`. Locate the section under `* Mock Mind Map Placeholder *` and replace it with `<MindMapCanvas />`:
  
  ```typescript
  // Modify imports
  import Sidebar from "@/components/ui/Sidebar";
  import ChatPanel from "@/components/chat/ChatPanel";
  import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
  ```
  
  Replace lines 57-87:
  ```typescript
  {/* Mind Map Pane (Right 60% on desktop) */}
  <div
    className={`h-full flex-1 flex flex-col min-w-0 overflow-hidden ${
      activePane === "mindmap" || activePane === "split" ? "flex" : "hidden lg:flex"
    }`}
  >
    <MindMapCanvas />
  </div>
  ```

- [ ] **Step 2: Commit Integration changes**
  Run:
  ```bash
  git add app/chat/page.tsx
  git commit -m "feat: replace mock mind map panel with the interactive React Flow canvas"
  ```

---

### Task 8: Lint, Typecheck and Validate
**Files:**
- None

- [ ] **Step 1: Run linter check**
  Run: `npm run lint`
  Expected: No linting syntax errors. If errors arise, correct them.

- [ ] **Step 2: Run typescript checks**
  Run: `npm run typecheck`
  Expected: Complete type-safe compilations without issues.

- [ ] **Step 3: Run full validate script**
  Run: `npm run validate`
  Expected: Success.

---

## Verification Plan

### Automated Tests
*   Run the project check tools:
    *   `npm run validate` to ensure complete code compliance.

### Manual Verification
*   Launch the development server: `npm run dev`
*   Open the browser at `http://localhost:3000/chat`
*   Verify side-by-side split panels render correctly.
*   Interact with the Mind Map canvas:
    1.  Verify smooth panning and zooming.
    2.  Click a node (e.g. "Acute Vertigo Presentation") and ensure the sliding side drawer opens.
    3.  Confirm recommendations and citations list the Egyptian Ministry of Health (MOH) guidelines.
    4.  Click the "Brainstorm on this" button in the drawer and ensure a new node gets created to the right and connected, with the focus sliding details updated to the new node.
    5.  Interact with the Toolbar buttons: test "Clear Map" (empties all nodes) and "Regenerate" (rebuilds the initial Vertigo mapping).
