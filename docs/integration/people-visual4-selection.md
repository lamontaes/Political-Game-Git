# PEOPLE-VISUAL4 appearance and wardrobe adapter

`src/presentation/person-visual-selection.ts` accepts the caller's character
library. It imports no production, candidate or generated-art bank. A review
caller supplies its isolated review library; the production caller supplies the
approved catalog. Enumeration and saved preferences never promote art or waive
the existing render-plan release and fit gates.

## Appearance selector

```ts
const context = { library, poseFamily: "standing-neutral" };
const options = listPersonVisualSelections({
  ...context,
  appearance: world.people[personId]!.appearance!,
});
const updated = setPersonVisualSelection(
  world,
  personId,
  options[index]!.selection,
  context,
);
```

Each option carries `{ bodyFamily, headFamily, hairFamily }`, the actual resolved
body/head/hair asset IDs and their existing release eligibility. Hair `null`
explicitly removes optional front and paired back hair. Options are compatible
with the actual resolved body, head, pose and facing. Their presence is not a
complete-wardrobe, measured-fit or human visual-acceptance claim.

The adapter diagnoses missing required wardrobe families while inspecting
identity. A supplied partial review library can therefore expose a valid
body/head/hair choice even when a bottom or shoe is absent. Those gaps still
belong to the render plan; normal resolver defaults and production completion
gates are unchanged. A requested wardrobe family must still resolve and project
exactly, so a missing bottom cannot become an accepted saved wardrobe choice.

Only `setPersonVisualSelection` writes the canonical
`PersonAppearance.selection`. It returns a new World and person while preserving
the appearance seed, recipe version, catalog pin (including an absent legacy
pin), other people, facts, history and person order. Persist that returned World
through the existing save interface; scene and dossier consumers receive the
same saved appearance. The writer validates the requested choice directly; it
does not search seeds or choose a fallback.

Without `selection`, legacy recipe output is unchanged. Explicit selections use
the person's pin, defaulting to generation 1 when absent. They cannot name a
later-generation family or override that pin through the recipe request.
Unavailable choices throw. A pose that lacks the selected components is not a
reason to change identity; the writer refuses it. Existing bodies that bake a
head cannot also accept a separate explicit head choice.

## Wardrobe selector and save/reload

```ts
const person = updated.people[personId]!;
const families = listPersonWardrobeFamilies(person, context);
const preference: PersonWardrobePreference = {
  personId,
  families: { top: families.top[0]! },
};
// Persist preference in the existing per-save UI store at this canonical ID.
const wardrobe = resolvePersonWardrobeContext(person, preference, context);
// Pass this same wardrobe to the existing scene/dossier render-plan consumer.
```

Preferences contain singleton family strings for `top`, `bottom` and
`footwear`. Omitted kinds retain their seeded wardrobe choice. The adapter
converts strings to the shared compositor's singleton family arrays, checks
actual body/pose/facing compatibility and fit refusal, and rejects preferences
for another person, unknown kinds, arrays, empty names or unavailable families.
The combined choice is also checked for slot conflicts.

Wardrobe preferences remain in the existing per-save UI state keyed by
canonical person ID; they do not rewrite identity or create new simulation
history. After loading a save, validate the saved preference against that
person and the actual pose before rendering. Report a refusal explicitly; do
not catch it and silently substitute another wardrobe or remove a saved choice.
The UI owner remains responsible for controls, durable UI state and forwarding
the same context through scenes, dossiers and reload.

## Verification

The focused test file covers legacy recipe bytes, exact posed enumeration,
explicit null hair, invalid family/pin refusals, immutable World updates,
World serialization, established-recipe reproduction, singleton wardrobe
serialization and exact-body/pose refusals. Existing character-component and
PEOPLE1-R1 wardrobe/save identity tests remain regression controls. This adapter
does not supply browser interaction or visual acceptance evidence.

## Shared controls and portrait consumer

`src/player/PersonAppearanceControls.tsx` accepts `{ world, personId, library,
poseFamily, preference?, onWorldChange, onPreferenceChange }`. Mount it in the
existing dossier/personal workspace and persist both callbacks through the
existing World and per-save interface stores. It creates no preview identity.
Before creator generation there is no canonical person to pass; mount against
that generated person afterward.

Dependent controls use `selectionFilter` on the same enumeration API to avoid
resolving thousands of unrelated body/head/hair combinations on each edit. The
filter removes work, not content. An incompatible retained wardrobe remains
visible with an explicit refusal and an unavailable selected option; editing
one kind does not discard other saved kinds.

`PersonPortrait` accepts optional `visualLibraries: { characters, visuals }`
and `wardrobe`. `resolvePersonPortrait` accepts the equivalent `libraries` and
`wardrobe` options. Both retain production defaults and fixture-only likeness
refusal. A caller supplying a review library must keep that opt-in boundary
visible and out of ordinary production catalog construction.

The PEOPLE developer review mounts these actual controls, the shared portrait,
and registered scene compositor against one serialized canonical World. The UI
owner owns root routes, ordinary save persistence, dossier/conversation/creator
mounting, and combined browser proof on #144. Candidate presence is not approval.

## Per-person scene wardrobe

```ts
const people = planLifeScenePeople(world, present, sceneId, legacyWardrobe, {
  wardrobeByPersonId: savedInterfaceState.personWardrobes,
});
```

The fifth argument uses each canonical person's saved preference and the
compositor's resolved pose. A missing map key retains the legacy global context.
An invalid explicit preference produces `wardrobeRefusal` and empty art layers
for that person; it does not fall back to global clothes or affect other people.
The optional `resolveWardrobe(person, preference, { scene, anchor })` permits a
caller-owned validation context. Actual `planLifeScenePeople` rendering retains
its production library; candidate scene proof uses explicit review composition.

`familyLabels` optionally supplies user-facing names keyed by family. Without
caller labels, controls use numbered Body/Face/Hairstyle and wardrobe choices;
internal IDs remain values rather than ordinary product text. The identity
controls have stable `person-appearance-bodyFamily`, `-headFamily`, `-hairFamily`
test IDs and accessible names Body, Face and Hairstyle. Responsive styles are
feature-local in `PersonAppearanceControls.css`.
