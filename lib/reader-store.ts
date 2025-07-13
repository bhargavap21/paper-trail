import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PaperType {
  _id: string;
  title: string;
  authors: string[] | string;
  abstract?: string;
  year?: string;
  venue?: string;
  url?: string;
  filePath?: string;
  sections?: any[];
  originalName?: string;
}

interface ReaderState {
  openPapers: Array<{ id: string; title: string; paper: PaperType }>;
  activePaperId: string;
  hasHydrated: boolean;
  setOpenPapers: (papers: Array<{ id: string; title: string; paper: PaperType }>) => void;
  setActivePaperId: (id: string) => void;
  addPaper: (paper: { id: string; title: string; paper: PaperType }) => void;
  removePaper: (id: string) => void;
  clearAllPapers: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      openPapers: [],
      activePaperId: '',
      hasHydrated: false,
      setOpenPapers: (papers) => set({ openPapers: papers }),
      setActivePaperId: (id) => set({ activePaperId: id }),
      addPaper: (paper) => set((state) => {
        if (!state.openPapers.some(p => p.id === paper.id)) {
          return { openPapers: [...state.openPapers, paper] };
        }
        return state;
      }),
      removePaper: (id) => set((state) => ({
        openPapers: state.openPapers.filter(p => p.id !== id),
        activePaperId: state.activePaperId === id ? '' : state.activePaperId
      })),
      clearAllPapers: () => set({ openPapers: [], activePaperId: '' }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated })
    }),
    {
      name: 'reader-tabs-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
) 