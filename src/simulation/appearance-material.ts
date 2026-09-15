/** Saved drawing parameters only; no DOM, source bank or demographic inference. */
export interface AppearanceMaterial {
  readonly version: "engine-people29-v1";
  readonly familyId: string;
  readonly palettes: Readonly<
    Record<"skin" | "hair" | "top" | "bottom", string>
  >;
  readonly features: Readonly<
    Record<
      "eyes" | "brows" | "nose" | "mouth",
      {
        readonly variant: string;
        readonly x: number;
        readonly y: number;
        readonly scaleX: number;
        readonly scaleY: number;
      }
    >
  >;
}
export function assertAppearanceMaterial(
  value: unknown,
): asserts value is AppearanceMaterial {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid appearance material record.");
  const v = value as AppearanceMaterial;
  if (
    v.version !== "engine-people29-v1" ||
    typeof v.familyId !== "string" ||
    !v.familyId ||
    Object.keys(v).some(
      (k) => !["version", "familyId", "palettes", "features"].includes(k),
    )
  )
    throw new Error("Unsupported appearance material version.");
  if (
    !v.palettes ||
    Object.keys(v.palettes).sort().join() !== "bottom,hair,skin,top" ||
    Object.values(v.palettes).some((p) => typeof p !== "string" || !p)
  )
    throw new Error("Invalid appearance palettes.");
  if (
    !v.features ||
    Object.keys(v.features).sort().join() !== "brows,eyes,mouth,nose"
  )
    throw new Error("Invalid appearance features.");
  for (const f of Object.values(v.features))
    if (
      !f ||
      typeof f.variant !== "string" ||
      !f.variant ||
      Object.keys(f).sort().join() !== "scaleX,scaleY,variant,x,y" ||
      ![f.x, f.y, f.scaleX, f.scaleY].every(Number.isFinite) ||
      Math.abs(f.x) > 3 ||
      Math.abs(f.y) > 3 ||
      f.scaleX < 0.9 ||
      f.scaleX > 1.1 ||
      f.scaleY < 0.9 ||
      f.scaleY > 1.1
    )
      throw new Error(
        "Appearance feature parameters exceed their supported range.",
      );
}
