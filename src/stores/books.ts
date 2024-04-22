import { writable } from "svelte/store";
import type { LibraryBook } from "../bindings";

export const books = writable([] as LibraryBook[]);
