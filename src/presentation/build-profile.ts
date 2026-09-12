/**
 * Packaged-build identity. Production stays production. An internal
 * art-review profile is a separately identified Vite define
 * (`VITE_OCD_BUILD_PROFILE=internal-art-review`) and does not turn
 * `import.meta.env.DEV` on. Candidate composition in that profile is the
 * existing art-preview adapter, isolated from ordinary saves.
 */
export type GameBuildProfile = "production" | "internal-art-review";

export function gameBuildProfile(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): GameBuildProfile {
  return env.VITE_OCD_BUILD_PROFILE === "internal-art-review"
    ? "internal-art-review"
    : "production";
}
