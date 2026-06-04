import { create } from 'zustand';

type State = {
  // approval queue
  focusedMessageId: string | null;
  removedMessageIds: string[];
  setFocused: (id: string | null) => void;
  markRemoved: (id: string) => void;
  // kanban stage overrides (lead_id -> new stage)
  stageOverrides: Record<string, string>;
  setStage: (leadId: string, stage: string) => void;
  // command palette
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  // escalation acknowledged ids (UI only)
  ackEscalations: string[];
  ackEscalation: (id: string) => void;
};

export const useAppStore = create<State>((set) => ({
  focusedMessageId: null,
  removedMessageIds: [],
  setFocused: (id) => set({ focusedMessageId: id }),
  markRemoved: (id) =>
    set((s) => ({ removedMessageIds: [...s.removedMessageIds, id] })),
  stageOverrides: {},
  setStage: (leadId, stage) =>
    set((s) => ({ stageOverrides: { ...s.stageOverrides, [leadId]: stage } })),
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  ackEscalations: [],
  ackEscalation: (id) => set((s) => ({ ackEscalations: [...s.ackEscalations, id] })),
}));
