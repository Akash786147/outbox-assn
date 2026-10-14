import { create } from "zustand";
import type { EmailStatus } from "@/types";

interface InboxState {
  search: string;
  statusFilter: EmailStatus | null;
  setSearch: (search: string) => void;
  setStatusFilter: (status: EmailStatus | null) => void;
  reset: () => void;
}

export const useInboxStore = create<InboxState>()((set) => ({
  search: "",
  statusFilter: null,
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  reset: () => set({ search: "", statusFilter: null }),
}));
