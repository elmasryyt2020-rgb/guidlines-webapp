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
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<ClinicalNodeData>[] });
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
    let nodeColorClass = "testNode";
    let childLabel = "Additional Diagnostic Check";
    let childDesc = "Brainstormed assessment parameter.";
    let childRecs = ["MOH Assessment Checklist detail.", "Perform clinical verification."];

    if (parentNode.type?.includes("symptom")) {
      nodeColorClass = "diagnosisNode";
      childLabel = "Labyrinthitis Differential";
      childDesc = "Differential diagnosis for sensory hearing loss combined with vertigo.";
      childRecs = [
        "Perform pure tone audiometry to screen for high frequency hearing loss.",
        "Rule out suppurative otitis media with otoscopic inspection."
      ];
    } else if (parentNode.type?.includes("diagnosis")) {
      nodeColorClass = "testNode";
      childLabel = "Caloric Reflex Testing";
      childDesc = "Oculomotor assessment via warm/cool water irrigation.";
      childRecs = [
        "Perform video-nystagmography (VNG) caloric stimulation.",
        "Observe COWS rule: Cold Opposite, Warm Same."
      ];
    } else if (parentNode.type?.includes("test")) {
      nodeColorClass = "treatmentNode";
      childLabel = "Semont Repositioning";
      childDesc = "Rapid side-lying maneuver for posterior semicircular canalolithiasis.";
      childRecs = [
        "Swing patient from one lateral position to the opposite lateral position in one rapid arc.",
        "Hold terminal posture for 2-3 minutes before returning to upright position."
      ];
    } else if (parentNode.type?.includes("treatment")) {
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
