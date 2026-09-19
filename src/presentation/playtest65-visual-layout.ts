/** Measured candidate plate coordinates; presentation slots are proposed against
 * these pixels, not a claim that the two officials are physically present. */
export const PLAYTEST65_WHITE_HOUSE_LAYOUT = {
  revision: "playtest65-white-house-wide-r1",
  status: "candidate-integration-review",
  assetId: "env_playtest65_white_house_north_wide_r1",
  canvas: { width: 1672, height: 941 },
  architectureBounds: { x: 790, y: 285, width: 610, height: 240 },
  president: { x: 240, y: 290, width: 300, height: 600 },
  presidentFeet: { x: 390, y: 890 },
  information: { x: 940, y: 635, width: 630, height: 265 },
  vicePresident: { x: 1190, y: 750, width: 340, height: 140 },
  vicePresidentPresentation: "record-card",
  // Resolve through the existing asset manifest/repositoryVisualUrls in review mode.
  // Runtime approval and actual saved-figure composite review are still pending.
  plateUrl: null,
} as const;

/** Source-space estimates for authoring seated paint; not a calibrated scene.
 * The desk-front occlusion must be verified with actual body/arm/hand layers. */
export const PLAYTEST65_RESOLUTE_LAYOUT = {
  assetId: "env_playtest65_resolute_desk_r1",
  status: "awaiting-seated-contact-review",
  canvas: { width: 1672, height: 941 },
  chairBounds: { x: 712, y: 335, width: 245, height: 145 },
  deskBounds: { x: 275, y: 474, width: 1117, height: 396 },
  deskRearEdge: [
    { x: 438, y: 477 },
    { x: 1225, y: 477 },
  ],
  deskFrontEdge: [
    { x: 282, y: 533 },
    { x: 1385, y: 533 },
  ],
  proposedHandContacts: [
    { x: 755, y: 500 },
    { x: 910, y: 500 },
  ],
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
