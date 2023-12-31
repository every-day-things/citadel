import { writable } from "svelte/store";
import type { Path, PathValue } from "tauri-settings/dist/types/dot-notation";
import { SettingsManager, type ConfigOptions } from "tauri-settings";

export type SettingsSchema = {
  theme: "dark" | "light";
  startFullscreen: boolean;
  calibreLibraryPath: string;
};

let resolveSettingsLoaded: () => void;
const settingsLoadedPromise = new Promise<void>((resolve) => {
  resolveSettingsLoaded = resolve;
});

const genSettingsManager = <T extends SettingsSchema>(
  defaultSettings: T,
  config: ConfigOptions
): SettingsManager<T> => {
  if (window.__TAURI__) {
    return new SettingsManager(defaultSettings, config);
  } else {
    return {
      initialize: () => {
        Object.entries(defaultSettings).forEach((setting) => {
          localStorage.setItem(setting[0], setting[1].toString());
        });
        return Promise.resolve({} as T);
      },
      syncCache: () => Promise.resolve({} as T),
      set: (key, value) => {
        localStorage.setItem(key.toString(), String(value));

        return Promise.resolve({} as T);
      },
      get: (key) => {
        return Promise.resolve(
          localStorage.getItem(key.toString()) as PathValue<T, typeof key>
        );
      },
      settings: defaultSettings,
    };
  }
};

const createSettingsStore = () => {
  const settings = writable<SettingsSchema>();
  const manager = genSettingsManager(
    {
      theme: "light",
      startFullscreen: false,
      calibreLibraryPath: "",
    },
    {}
  );
  manager.initialize().then(async () => {
    await manager.syncCache();
    for (const [key, value] of Object.entries(manager.settings)) {
      settings.update((s) => ({ ...s, [key]: value }));
    }
    resolveSettingsLoaded();
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

export const waitForSettings = () => settingsLoadedPromise;
export const settings = createSettingsStore();
