import { URL } from "node:url";
import console from "node:console";
import process from "node:process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const paths = [
  "art/backdrops/staging.json",
  "art/backdrops/surfaces.json",
  "art/manifest/pose_families.json",
  "art/people-engine/v1/manifest.json",
];
const [staging, surfaces, families, pack] = paths.map(read);
const kinds = ["stand", "sit", "lean", "podium"];
const roles = [
  "general",
  "staff-behind-counter",
  "customer",
  "member-at-dais",
  "witness",
  "audience",
  "speaker",
  "doorway",
  "judge",
  "jury",
  "counsel",
  "presiding",
];
const report = {
  places: Object.keys(staging.places).length,
  taggedPlaces: 0,
  spots: 0,
  taggedSpots: 0,
  spotsPerPlace: {},
  spotsByKind: Object.fromEntries(kinds.map((k) => [k, 0])),
  spotsByRole: Object.fromEntries(roles.map((k) => [k, 0])),
  poseFamilies: families.families.length,
  familiesPerSlotKind: Object.fromEntries(kinds.map((k) => [k, 0])),
  packPosesPerSlotKind: Object.fromEntries(kinds.map((k) => [k, 0])),
  surfacePlaces: 0,
  surfaces: 0,
  liveSurfaces: 0,
  missingSurfaceAuditPlaces: [],
  errors: [],
  sourceHashes: Object.fromEntries(
    paths.map((path) => [
      path,
      createHash("sha256")
        .update(readFileSync(new URL(`../../${path}`, import.meta.url)))
        .digest("hex"),
    ]),
  ),
};
for (const [place, stage] of Object.entries(staging.places)) {
  report.spotsPerPlace[place] = stage.spots.length;
  report.spots += stage.spots.length;
  if (stage.spots.every((s) => roles.includes(s.role))) report.taggedPlaces++;
  for (const spot of stage.spots) {
    const kind = spot.pose ?? "stand";
    if (!kinds.includes(kind))
      report.errors.push(`${place}: unknown spot kind ${kind}`);
    else report.spotsByKind[kind]++;
    if (roles.includes(spot.role)) {
      report.taggedSpots++;
      report.spotsByRole[spot.role]++;
    } else report.errors.push(`${place}: missing/unknown role`);
    if (spot.floor && !stage.floors?.[spot.floor])
      report.errors.push(`${place}: unknown floor ${spot.floor}`);
  }
  const registered = surfaces.places[place];
  if (!registered) report.missingSurfaceAuditPlaces.push(place);
  const slots = stage.surfaceSlots ?? [];
  if (slots.length) report.surfacePlaces++;
  for (const slot of slots) {
    const source = registered?.surfaces.find((s) => s.id === slot.surfaceId);
    if (!source) {
      report.errors.push(`${place}: unresolved surface ${slot.surfaceId}`);
      continue;
    }
    const xs = source.quad.map((p) => p[0]),
      ys = source.quad.map((p) => p[1]);
    if (
      slot.kind !== source.kind ||
      slot.x !== Math.min(...xs) ||
      slot.y !== Math.min(...ys) ||
      slot.width !== Math.max(...xs) - Math.min(...xs) ||
      slot.height !== Math.max(...ys) - Math.min(...ys)
    )
      report.errors.push(`${place}: surface geometry drift ${slot.surfaceId}`);
    report.surfaces++;
    if (source.shows.length) report.liveSurfaces++;
  }
  if (slots.length !== (registered?.surfaces.length ?? 0))
    report.errors.push(`${place}: surface coverage drift`);
}
for (const family of families.families) {
  if (!family.slot_kinds?.length)
    report.errors.push(`${family.pose_family_id}: no slot kinds`);
  for (const kind of family.slot_kinds ?? []) {
    if (!kinds.includes(kind))
      report.errors.push(`${family.pose_family_id}: unknown slot kind`);
    else report.familiesPerSlotKind[kind]++;
  }
}
for (const [presentation, front] of Object.entries(pack.presentations)) {
  for (const [viewName, view] of Object.entries({ front, ...front.views })) {
    for (const pose of [
      "standing",
      ...(view.seated ? ["seated"] : []),
      ...Object.keys(view.poses ?? {}),
    ]) {
      const fits = pack.slotKindsByPose?.[pose];
      if (!fits?.length)
        report.errors.push(
          `${presentation}/${viewName}/${pose}: no slot kinds`,
        );
      for (const kind of fits ?? []) {
        if (!kinds.includes(kind))
          report.errors.push(`${pose}: unknown slot kind`);
        else report.packPosesPerSlotKind[kind]++;
      }
    }
  }
}
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
