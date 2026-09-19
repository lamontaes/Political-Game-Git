/** Authoring targets, in pixels; returned environment paint must be measured
 * before these become a calibrated runtime scene. No placeholder art URL. */
export const PLAYTEST65_WHITE_HOUSE_LAYOUT = {
  revision: "playtest65-layout-v1",
  status: "awaiting-artwork",
  canvas: { width: 1600, height: 900 },
  president: { x: 135, y: 285, width: 330, height: 560 },
  presidentFeet: { x: 300, y: 845 },
  information: { x: 850, y: 560, width: 640, height: 265 },
  vicePresident: { x: 1160, y: 650, width: 330, height: 175 },
  // VP is a record card, never evidence that both people are physically here.
  vicePresidentPresentation: "record-card",
  plateUrl: null,
} as const;

export type RecordPoseRepertoire =
  "composed" | "engaged" | "reflective" | "expressive";
export interface RecordPoseSource {
  readonly id: string;
  readonly poseFamily: string;
  readonly repertoire: RecordPoseRepertoire;
  readonly distinctSourceSha256: string;
}
/** Select only actually supplied, supported paint. No trait inference or sim RNG.
 * The same person/context remains stable across reopening and Save/Continue. */
export function selectRecordPose(
  personId: string,
  context: {
    readonly repertoire?: RecordPoseRepertoire;
    readonly key?: string;
  },
  sources: readonly RecordPoseSource[],
  supportedPoseFamilies: readonly string[],
): string {
  const usable = sources
    .filter(
      (s) =>
        s.distinctSourceSha256 &&
        s.repertoire === context.repertoire &&
        supportedPoseFamilies.includes(s.poseFamily),
    )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!usable.length) return "standing-neutral";
  let hash = 2166136261;
  for (const c of `${personId}\0${context.key ?? "record"}\0${context.repertoire ?? "composed"}`)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return usable[hash % usable.length]!.poseFamily;
}
