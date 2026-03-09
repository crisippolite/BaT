import { create } from "zustand";

interface AppState {
  // Monitoring toggle
  monitoringEnabled: boolean;
  toggleMonitoring: () => void;

  // Compare list
  compareIds: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  // Sidebar (mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  monitoringEnabled: true,
  toggleMonitoring: () =>
    set((state) => ({ monitoringEnabled: !state.monitoringEnabled })),

  compareIds: [],
  addToCompare: (id) =>
    set((state) => ({
      compareIds: state.compareIds.includes(id)
        ? state.compareIds
        : [...state.compareIds, id],
    })),
  removeFromCompare: (id) =>
    set((state) => ({
      compareIds: state.compareIds.filter((i) => i !== id),
    })),
  toggleCompare: (id) =>
    set((state) => ({
      compareIds: state.compareIds.includes(id)
        ? state.compareIds.filter((i) => i !== id)
        : [...state.compareIds, id],
    })),
  clearCompare: () => set({ compareIds: [] }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
