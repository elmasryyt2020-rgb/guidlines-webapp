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
import { getSupabaseClient } from "./supabaseClient";
import { GetToken } from "./store";

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
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  fetchMindMap: (conversationId: string, getToken: GetToken) => Promise<void>;
  selectNode: (nodeId: string) => void;
  closeDrawer: () => void;
  brainstormOnNode: (conversationId: string, nodeId: string, getToken: GetToken) => Promise<void>;
  regenerateMap: (conversationId: string, getToken: GetToken) => Promise<void>;
  clearMap: (conversationId: string, getToken: GetToken) => Promise<void>;
  saveLayout: (conversationId: string, getToken: GetToken) => Promise<void>;
  clearToast: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  drawerOpen: false,
  toastMessage: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<ClinicalNodeData>[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  fetchMindMap: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("mind_maps")
        .select("nodes, edges")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (error) throw error;
      set({
        nodes: (data?.nodes as unknown as Node<ClinicalNodeData>[]) || [],
        edges: (data?.edges as unknown as Edge[]) || [],
        selectedNode: null,
        drawerOpen: false
      });
    } catch (err) {
      console.error("Fetch mindmap failed", err);
    }
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

  brainstormOnNode: async (conversationId, nodeId, getToken) => {
    set({ toastMessage: "Brainstorming new pathways..." });
    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/brainstorm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, nodeId }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { nodes, edges } = (await response.json()) as {
        nodes: Node<ClinicalNodeData>[];
        edges: Edge[];
      };
      set({ nodes, edges, toastMessage: "Mind map expanded!" });

      // Focus the side drawer on the newly added child node, if any
      const newChild = nodes.find((n) => n.id.startsWith("brainstorm-") && !get().nodes.some(ex => ex.id === n.id));
      if (newChild) {
        set({ selectedNode: newChild, drawerOpen: true });
      }
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Brainstorming failed." });
    }
  },

  regenerateMap: async (conversationId, getToken) => {
    set({ toastMessage: "Regenerating mind map..." });
    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/brainstorm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { nodes, edges } = (await response.json()) as {
        nodes: Node<ClinicalNodeData>[];
        edges: Edge[];
      };
      set({ nodes, edges, selectedNode: null, drawerOpen: false, toastMessage: "New map generated." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Regeneration failed." });
    }
  },

  clearMap: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { error } = await supabase
        .from("mind_maps")
        .update({ nodes: [], edges: [] })
        .eq("conversation_id", conversationId);

      if (error) throw error;
      set({ nodes: [], edges: [], selectedNode: null, drawerOpen: false, toastMessage: "Map cleared." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Clear failed." });
    }
  },

  saveLayout: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { error } = await supabase
        .from("mind_maps")
        .update({
          nodes: get().nodes,
          edges: get().edges,
          updated_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId);

      if (error) throw error;
      set({ toastMessage: "Positions saved to database." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Failed to save positions." });
    }
  },

  clearToast: () => set({ toastMessage: null })
}));
