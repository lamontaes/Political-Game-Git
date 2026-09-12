/**
 * Packaged-build identity. Production stays production. An internal
 * art-review profile is a separately identified Vite define
 * (`VITE_OCD_BUILD_PROFILE=internal-art-review`) and does not turn
 * `import.meta.env.DEV` on. Candidate people still require the existing
 * UI-bearing art-preview adapter, which is gated on development today.
 */
export type GameBuildProfile = "production" | "internal-art-review";

export function gameBuildProfile(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): GameBuildProfile {
  return env.VITE_OCD_BUILD_PROFILE === "internal-art-review"
    ? "internal-art-review"
    : "production";
}
