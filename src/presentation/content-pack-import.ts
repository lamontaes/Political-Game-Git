import { assertWorldIntegrity } from "../simulation/world";
import {
  installRuntimeContentPack,
  parseRuntimeContentPack,
} from "../simulation/runtime-content-packs";
import type { World } from "../simulation/types";

/** Parse and validate the entire proposed life before the caller saves anything. */
export function importContentPack(world: World, input: string): World {
  assertWorldIntegrity(world);
  const next = installRuntimeContentPack(world, parseRuntimeContentPack(input));
  assertWorldIntegrity(next);
  return next;
}
