import type { LibraryBook } from "../bindings";
import { writable } from "svelte/store";

export const books = writable([] as LibraryBook[]);
