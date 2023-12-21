import { writable } from "svelte/store";
import type { Path, PathValue } from "tauri-settings/dist/types/dot-notation";
import { SettingsManager } from "tauri-settings";

export type SettingsSchema = {
  theme: "dark" | "light";
  startFullscreen: boolean;
  calibreLibraryPath: string;
};

const createSettingsStore = () => {
  const settings = writable<SettingsSchema>({
    theme: "light",
    startFullscreen: false,
    calibreLibraryPath: "",
  });
  const manager = new SettingsManager<SettingsSchema>(
    {
      theme: "light",
      startFullscreen: false,
      calibreLibraryPath: "",
    },
    {}
  );
  manager.initialize().then(async () => {
    await manager.syncCache();
  });

  return {
    set: async <S extends Path<SettingsSchema>>(
      key: S,
      value: PathValue<SettingsSchema, S>
    ) => {
      settings.update((s) => ({ ...s, [key]: value }));
      await manager.set(key, value);
    },
    get: <S extends Path<SettingsSchema>>(key: S) => {
      return manager.get(key);
    },
    subscribe: settings.subscribe,
  };
};

export const settings = createSettingsStore();
