# Runtime ordinary content packs — API 1

This is the first D33 external-data increment. It adds ordinary authored scenes
through the existing `LifeSceneDefinition` → `openingLifeFamily` →
`eligibleEpisodeBeats` / `playEpisodeOption` contract. The existing scene flow
records presence, actor knowledge, selected choice, aftermath and exact canonical
minutes. It retains household, age, cast, enrollment, current scene and protected
time checks. A pack does not create public cash, office authority or political
outcomes.

## Author and import

The first-party examples are external files and use the same public registration
path available to other authors; no source edit or game rebuild is needed when
editing these files. The older compiled scene bank retains its original stable
IDs and shares the extracted compiler; its complete conversion to a packaged
bank is not claimed.

1. In an ordinary adult life, open the on-demand **Content packs** leaf.
2. Import `examples/content-packs/community-timing.json`, then
   `examples/content-packs/community-encounter.json`.
3. Return home and continue the ordinary scene choices. The window-box encounter
   competes in the existing eligible-scene selection. Either explicit choice
   takes 12 minutes and records its different aftermath. It buys no object.
4. Keep the life, return to the title and reopen it. The imported definitions,
   chosen event, knowledge and exact time remain in that life.

Integration status: the leaf exists at `src/player/ContentPackWorkspace.tsx`.
A must mount it in its current root with `world` and the existing autosaving
`onWorldChange` callback. This worker does not claim ordinary browser reachability
until that receiver is mounted and tested.

For a different duration in a new life, change the settings pack's version to
`1.1.0` and its `minutes` to (for example) 17. Change the encounter pack's version,
its dependency version and its scene `minutes` to match. Import those files in a
different life. The old life retains its 12-minute accepted version. Exact
agreement is deliberate: changing one file alone produces a clear refusal.
Changing labels, premise or aftermath also changes content identity.

The initial 1–120 minute scene bounds, 32 packs per life, 32 scenes/settings per
pack, eight choices per scene and 128 Ki UTF-16 input-character bound are authored
implementation safety limits, not empirical rates or permanent content caps.
Files are also size-checked before browser reading. Extending these bounds is a
versioned engineering change. UI prose remains escaped text.

## Identity and admission

`mod.` is reserved for runtime content. Each pack has a dotted id, exact
major.minor.patch version and `ordinary-scenes-v1` API. Scene and setting keys
belong to the containing pack's namespace. Runtime content cannot override
compiled scene identities. Packs can depend only on exact versions; dependencies
are topologically ordered, and independent packs sort by id. Duplicate pack or
definition identity, unsupported fields/API/authority, missing/version-conflicting
or cyclic dependencies, and malformed or undeclared setting references refuse.
There is no implicit last-file-wins override.

Only `authored-fiction` is admitted. This API cannot certify real legal facts.
The imported premise, choices and aftermath are authored fiction. Existing
episode prerequisites and person bindings decide whether a scene can occur.
No arbitrary conditions or commands are evaluated from strings. The same episode
eligibility contract can inspect an NPC; the controlled person's scene choices
remain protected by existing command checks.

`World.contentPacks` embeds the accepted immutable package definitions with their
API, exact versions/dependencies, effective order and canonical-content digests.
The compact digest is a reproducible name, not a signature or proof of trust.
Integrity compares complete canonical structures, not digest equality alone.
An external original file is no longer a live dependency after import; deleting
or changing that file cannot strip content from an existing life.

Import returns a new validated World. It does not alter the input, advance time,
replace a version already attached to that life, or make a save by itself.
Replacing/removing an installed pack needs a future explicit migration API.

## Save compatibility and rollback

Unmodified/no-pack Worlds continue to emit snapshot **15**, preserving their
original bytes and format identity. Pack-bearing Worlds emit **16**. New code
reads both; it requires the matching pack-presence/format combination. This is
necessary because old format-15 readers tolerated extra World fields and would
otherwise ignore pack requirements. Old builds refuse format 16.

All existing browser, portable and SQLite receivers call the same snapshot
codec. Validation occurs before a healthy writable load or save. Unsupported
API, missing embedded dependency, bad order/digest and malformed definitions
refuse; the original payload remains available under the existing quarantine/
refusal policy. There is no auto-removal, compatibility downgrade, life merger,
or automatic rewrite of originals. Current controller compatibility must hold
the changed World/codec surface until its verified migration policy accepts it.
Pack worlds cannot be rolled back to old code by dropping their metadata.

## Remaining migration scope and owner agreements

This is a small shared compiler extraction and an additive cross-cutting
World/codec extension, not a replacement World, clock or history engine. Every
domain that currently consults mutable global definitions still needs its own
accepted-definition resolver and migration evidence. D owns existing degree
terms; T's local `026c7a39` already owns exact transit production admission; F
owns real public payment; N/S/M/K own result, office/term and prospective rule
interfaces. Their records are not reinterpreted by an ordinary scene pack.

No pack-driven election/office adapter is implemented here. Two institutional
contexts remain N/S/M/K's concrete next consumer proof. Existing wrappers cannot
claim a result automatically grants a term, or descriptive institution labels
grant legal authority. This content delivery need not hold their work.

Localization bundles and asset references require their own bounded type,
identity, rights and fallback contracts. Archives need entry/path/size validation;
the current loader accepts one JSON file and has no extraction path. Behavior
mods need a reviewed isolated runtime exposing a finite command/event capability
bridge, execution budget, deterministic inputs, versioned scoped state and
transactional refusal. Those are meaningful additional work. This release has
no callbacks, raw eval, dynamic modules, Node/Electron privileges, network or
filesystem access for pack content. Data packs are not a claim of full scripting
moddability.

## Scoped integrity audit / LEARN

Preserved: canonical World/person/clock/history identity, no ambient randomness,
explicit actor choice, person access, existing scene conditions, exact time and
protected commitments, historical events and no-pack snapshots.

Corrected: optional World fields alone do not guarantee backward compatibility.
The pack-bearing snapshot discriminator is required and tested so older readers
refuse before they can silently ignore a definition dependency.

Deferred with named receiver: A's ordinary file-picker/scene/save browser proof;
domain-owned accepted definition adapters; full compiled-bank migration;
isolated behavior extensions; application update acceptance. No global gate.
