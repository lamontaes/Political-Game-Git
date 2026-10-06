import type { BodyPresentation } from "./appearance-engine/pack";
import { PEOPLE_PACK } from "./appearance-engine/runtime";

/**
 * Faces offered by the creator are identities, not the older paintings of the
 * same identities. Keep this rule presentation-neutral: a masculine creator
 * and a feminine creator receive the full identity bank for their body rather
 * than a caller supplying a shorter gender-specific list.
 */
export function creatorFaceIds(
  presentation: BodyPresentation,
): readonly string[] {
  const faces = PEOPLE_PACK.presentations[presentation].faces;
  const young = faces.filter((face) => face.id.startsWith("20s30s-"));
  return (young.length > 0 ? young : faces).map((face) => face.id);
}
