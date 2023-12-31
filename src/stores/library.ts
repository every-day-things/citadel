/**
 * Svelte store to wrap the Library client.
 * See {@link initClient} for more details about setting up the client.
 */
import { initClient } from "$lib/library/libraryCommsManager";
import { type Library, type Options } from "$lib/library/typesLibrary";
import { get, writable } from "svelte/store";

let resolveClientReady: () => void;
const clientReadyPromise = new Promise<void>((resolve) => {
  resolveClientReady = resolve;
});

/**
 * Svelte store to wrap the Library client.
 */
export const libraryClientStore = writable<Library>();
/**
 * A Promise that resolves when the library client is ready.
 */
export const waitForLibrary = () => clientReadyPromise;
/**
 * Directly get the library client, without subscribing to changes.
 */
export const libraryClient = (): Library => {
  return get(libraryClientStore);
};

export const initLibrary = async (options: Options) => {
  if (options.connectionType === "remote") {
    return;
  }

  const client = await initClient({
    libraryType: "calibre",
    connectionType: "local",
    "libraryPath": options.libraryPath
  });

  libraryClientStore.set(client);
  resolveClientReady();
};
