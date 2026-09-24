import { expect, it } from "vitest";
import {
  acquirePreparedVariant,
  preparedVariantCacheSize,
} from "./engine-people29-svg";
import type { AppearanceMaterial } from "../simulation/appearance-material";

// Absent fixtures: each render rejects as soon as it starts, so the order of
// rejections is the order in which the queue started the renders.
const material = (familyId: string) =>
  ({
    version: "engine-people29-v1",
    familyId,
    palettes: {},
    features: {},
  }) as unknown as AppearanceMaterial;

it("renders a figure in view before option thumbnails requested earlier", async () => {
  const order: string[] = [];
  const request = (name: string, priority: "high" | "low") => {
    const lease = acquirePreparedVariant(
      `absent-${name}`,
      material(name),
      [],
      "neutral",
      priority,
    );
    const settled = lease.url.catch((error: unknown) => {
      order.push(name);
      return String(error);
    });
    return { lease, settled };
  };
  const thumbs = [1, 2, 3, 4].map((n) => request(`thumb-${n}`, "low"));
  const preview = request("preview", "high");
  const reasons = await Promise.all([
    preview.settled,
    ...thumbs.map((t) => t.settled),
  ]);
  expect(order[0]).toBe("preview");
  expect(order.slice(1)).toEqual(["thumb-1", "thumb-2", "thumb-3", "thumb-4"]);
  // Every request really rendered: none was withdrawn.
  expect(reasons.every((r) => /Prepared family/.test(r))).toBe(true);
  [preview, ...thumbs].forEach((r) => r.lease.release());
  expect(preparedVariantCacheSize()).toBe(0);
});

it("withdraws a thumbnail render nobody waits for any more", async () => {
  const lease = acquirePreparedVariant(
    "absent-withdrawn",
    material("withdrawn"),
    [],
    "neutral",
    "low",
  );
  lease.release();
  await expect(lease.url).rejects.toThrow(/withdrawn/);
  expect(preparedVariantCacheSize()).toBe(0);
});
