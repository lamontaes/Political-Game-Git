# ENV-ALL1 integration delivery

Recipient: UI-CORE-RELEASE. Base: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.

The recovered claim that the patch was empty was incorrect. Its resolver treated
an invitation as attendance, and normal play exposed no activity execution.
The original note remains in the hashed recovery archive.

Apply `docs/integration/env-all1-ui-core.patch` after the ENV feature files.
It adds `VenueActivityPanel` to the ordinary day and suppresses household sprites
in a completed activity's venue. PEOPLE owns compatible participant placement;
UI must not carry the household cast into a venue merely because it was visible
at home. The component receives the caller's World/person/onWorldChange and owns
no save or clock.

`completedActivityHere` requires the actual completion state's outcome event and
`presence:participant`, at the current exact instant. `resolveVenueScene` draws
that immediate aftermath only. Reading/pinning cannot perform an activity.
`performVenueActivity` revalidates responsibility/access/timing and delegates to
`performScheduledActivity` with the existing transition registry. Unknown or
travel completions have no room and do not borrow the household image.

This is not persistent current-place or a travel provider. No travel duration,
provider availability, county/government equivalence, return journey, court type,
or workplace location is inferred. P07 remains a separate explicit gap until
supported travel/place facts exist. JUD-WORK2 confirms its office preparation
record is not evidence of a trial/appellate courtroom.

Shared materialization belongs to UI. Recovered environment-only changes:
`asset_manifest.json` courtroom row and tiers (still unreleased),
`environment_families.json` courtroom family, `provenance.json` derivation note.
No character rows changed. Source masters and source hashes are preserved.

Final exact commit and test evidence will be added at publication. Human visual
and art-release acceptance remain separate from automated tests.
