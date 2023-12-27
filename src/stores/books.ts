import type { CalibreBook } from "../bindings";
import { writable } from "svelte/store";

export const books = writable([] as CalibreBook[]);
