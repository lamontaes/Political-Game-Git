import type { PublicInformationPanelModel } from "../../../src/presentation/public-information-adapters";
import type { World } from "../../../src/simulation";
import { serializeWorld } from "../../../src/simulation";

export interface NewsSearch1LiveSnapshot {
  readonly world: string;
  readonly model: string;
}

/** Test-only read surface for fixture proofs; never imported by production code. */
export interface NewsSearch1TestHarness {
  readonly baseline: NewsSearch1LiveSnapshot;
  snapshot(): NewsSearch1LiveSnapshot;
  /** Deliberate post-setup mutation so purity assertions can be proven non-vacuous. */
  mutateWorldForNegativeControl(): void;
  replaceModel(nextModel: PublicInformationPanelModel): void;
}

export function snapshotNewsSearch1State(
  world: World,
  model: PublicInformationPanelModel,
): NewsSearch1LiveSnapshot {
  return {
    world: serializeWorld(world),
    model: JSON.stringify(model),
  };
}

export function attachNewsSearch1Harness(
  harness: NewsSearch1TestHarness,
): void {
  (window as NewsSearch1Window).newsSearch1Harness = harness;
}

export function readNewsSearch1Harness(): NewsSearch1TestHarness {
  const harness = (window as NewsSearch1Window).newsSearch1Harness;
  if (!harness) {
    throw new Error("news-search1 harness is not mounted");
  }
  return harness;
}

interface NewsSearch1Window extends Window {
  newsSearch1Harness?: NewsSearch1TestHarness;
}
