import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  showTitle: boolean;
  showSubtitle: boolean;
  titleKey: string;
  subtitleKey: string;
  toggleShowTitle: () => void;
  toggleShowSubtitle: () => void;
  setTitleKey: (key: string) => void;
  setSubtitleKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showTitle: false,
      showSubtitle: false,
      titleKey: 'Title',
      subtitleKey: 'Subtitle',
      toggleShowTitle: () => set((state) => ({ showTitle: !state.showTitle })),
      toggleShowSubtitle: () => set((state) => ({ showSubtitle: !state.showSubtitle })),
      setTitleKey: (key) => set({ titleKey: key }),
      setSubtitleKey: (key) => set({ subtitleKey: key }),
    }),
    {
      name: 'jextile-settings',
    }
  )
);
