import { createContext, useContext } from "react";
import type { World } from "../simulation/types";

export interface ReviewEnvironment {
  readonly storage: Storage;
  readonly initialWorld: World;
  readonly reportWorld: (world: World) => void;
}
export const ReviewContext = createContext<ReviewEnvironment | null>(null);
export function useReviewEnvironment() {
  return useContext(ReviewContext);
}
export function useReviewStorage(): Storage {
  return useReviewEnvironment()?.storage ?? window.localStorage;
}
