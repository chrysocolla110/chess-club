import { writable } from "svelte/store";
import type { GameState } from "./models";

export const gameStateStore = writable<GameState>();