import { IS_MOCK } from "../config";
import type { DataRepository } from "./repository";
import { mockRepository } from "./mockRepository";
import { supabaseRepository } from "./supabaseRepository";

/** The active repository, chosen once by the data-mode flag. */
export const repository: DataRepository = IS_MOCK
  ? mockRepository
  : supabaseRepository;

export type { DataRepository } from "./repository";
