# PLAYABLE29 prepared material increment

First safety freeze: 4f6dabd30b53107c6ab4474436a0f1b16c8ea9ad, PR233.
This increment consumes V's exact authoring subtree at
d285bd579ff7ea6b2ed7a2953e5115f1e28ca061. A's existing two-site opening adapter
is sufficient; there is no second root patch. Copy the material caller proof
into tests/e2e only in the composed receiver. B's leaf leaves PlayerGame unchanged.

The normal New Game → Personal → Appearance and wardrobe path offers six
separately authored standing families, two actual tops and two actual bottoms
per family, two head contours, two hairstyles, four independent material
channels, and four feature groups with two variants and authored parameter
bounds. Body changes preview matching clothing and require confirmation;
cancel leaves the saved person intact. Unsupported seated views remain absent.
Old generations and unmarked replay/load behavior remain exact.

The existing candidate-review provider gains frozen review generation5.
Source records are draft/pending/unreleased; production returns no candidate
provider. No art approval is implied. Native SVG is changed only inside supplied
material regions or bounded whole feature groups and remains in the existing
ModularCharacter image layers. No renderer, image model, paid generation or
training is added. Register/check deterministically with:

```sh
python3 scripts/art-asset-factory/register-engine-people29.py --check
```

Source part hashes, composed derivatives and generation membership are frozen.
Future drawing changes require new versioned source identities; do not edit
these saved-version inputs in place. Sleeves and shirt torso share one native
SVG image; the supplied matching front collar stays its coordinated helper.
Feet use V's measured drawing contact at native y1172. Drawing coordinates are
not physical dimensions. Original source files and rights-unknown provenance
remain in the authoring pack.

Canonical saved material data is
world.people[world.control.personId].appearance.material. It contains version,
familyId, palettes{skin,hair,top,bottom}, and features{eyes,brows,nose,mouth}, each
with variant,x,y,scaleX,scaleY. appearance.selection stores body/head/hair family;
appearance.outfit stores complete-outfit-v1 and top/bottom/footwear families.
All edits pass complete-outfit validation before the single World write.

Desktop: prepared img layers retain data-asset-id and data-kind, and add
data-material-version, data-material-parameters (exact material JSON), and
data-material-state loading/ready/unavailable. Wait for ready and img.decode().
Compare actual IDs, stored material JSON and fetched SVG content hashes across
reopen; Blob URLs themselves change. Cache creates only mounted variants,
shares active references, caps entries at64 and revokes on final release.
Desktop confirmed its existing CSP allows blob images; actual packaged lazy
chunk and SVG decoding must be checked on A's composed installed build.

Executed evidence before freeze: 39 focused regressions; four prepared-contract
tests (including frozen source bytes, old marked generation4 replay, rejection
before mutation and marked save roundtrip); seven V authoring contracts;
normal candidate palette/feature/clothing/save-reopen browser proof; all-six
keyboard swaps and preview cancel/confirm proof. The native material pixel
proof checks all72 components: alpha delta0, all132 ink/details groups byte
identical,66 recolorable components changed, six fixed leather shoes unchanged.
Two URL references shared one variant, final release revoked it, cache0→0.

Browser artifacts are outside the repository under
/private/tmp/p29-b-evidence/p29-material3 and /private/tmp/p29-b-evidence/p29-six7.
Material3's six-body subtest counted the separate preview (test selector issue);
the corrected six7 six-body proof passed. Mac headless arrow navigation is
inert even for a plain native select; verified typeahead supplies actual
keyboard activation. Final format/type/lint/art/corpus/release checks accompany
the frozen handoff.

Remaining art gap: V's smooth/faceted faces, restrained hands and geometric
cloth finish remain simpler than the owner's painted reference. Technical
success is not human visual acceptance. No additional fitting cycle is hidden
inside this increment. Scene/layout placement remains the respective owner's
work, and Desktop owns the packaged-app acceptance.

LEARN: compare persisted parameters and actual drawn source hashes, not
transient object URLs or a stable recipe label. Scope assertions to the saved
figure separately from its honest replacement preview. Keep source approval
status separate from the existing explicit review-only runtime lift.

Final B gates: whole-tree lint and TypeScript passed, scoped final lint passed;
all three required art gates passed; deterministic registration check passed;
corpus regenerated and exact check passed (2644 templates,265 warnings,
6583 unclassified candidates; no anchor/issuance edits). Published report files
contain the actual gate outputs; art warnings retain existing duplicate-hash
notices. Scope formatting passed after canonical registry formatting.
