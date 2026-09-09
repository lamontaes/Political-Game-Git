# CIVIL-WORK7 — source/consumer checkpoint, not personnel journey acceptance

Owner authority: [BUILD-OUT7 shared execution and section C](https://docs.google.com/document/d/1pWKdk65r36ge8Sk2dXRdBPxJ54k0vGN-RjZj5Fys0Us/edit).
The [completed P1A source acceptance](https://docs.google.com/document/d/1ViFBh08hfE8OcXo3PV6Nwn3nf7RzqfbBhbEyFcFZBeQ/edit)
is retained. Its former no-gameplay scope is historical; its evidence protections
are not weakened. The 92P matrix and companion are research leads, not production
evidence. No source-domain fact, raw byte, lock or accepted validator was changed.

## Exact input interfaces

| Input                         | Published head                                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| Main / feature base           | `701e68ca2fab1aa8b5a69b06c8e7ada312ae2aa3`                         |
| LIFE #141                     | `cb3a97ae1f8e67f99740607434d368ffcc3f3005`                         |
| EXEC #140                     | `d767b29102a3cd5e323631a6038946fa6e0b34d5`                         |
| UI #144 registration target   | `9f602f44e62ef04913a53515333dd03945c401f4`                         |
| Accepted source corpus digest | `9d63e5a66a1e4dcc9e08311b62c167818f705737779432a25dc17fb67dfd5c1f` |

Both LIFE and EXEC confirmed via task messages that their published interfaces
do **not** implement a public personnel permission gate. LIFE's
`PublicEmploymentPermissionProvider` is an alias, not an argument used by
`recruitLifePathPerson`; that writer refuses `public-office`. EXEC's
`resolveExecutiveOffice` establishes an actual office/term/employer but does not
establish appointment or disciplinary power over any employee class. Their
live LAND repair surfaces are untouched. This branch needs no donor merge for
its current preparation functions.

## Delivered APIs

- `compilePersonnelSourceProjection(lock)` reopens the accepted locked artifacts,
  compiles and validates the existing corpus, and projects all 510 fields with
  separate civil and bargaining field identities. All known fields preserve
  citations, URLs, artifact hashes and observation dates. Unknowns have no value.
- `queryPersonnelProtections(context, date)` reports class, employer-level and
  date limitations alongside observed source statements. Context must come from
  canonical employment data; display text is not an authority grant.
- `assessPersonnelAction(context, date, action)` reports dependent-field gaps.
  It does not treat a friend, relative, volunteer, title or bargaining right as
  public hiring authority. No authority-bearing action is executable in this
  checkpoint; source observation dates have not been converted to operative law.
- `publicEmploymentPermissionProvider(resolveContext)` implements LIFE's
  `LifeEligibilityProvider` interface. Missing context or unresolved predicates
  produce a reasoned refusal. Consumers must still recheck their own actor,
  employer, consent, account and action state before invoking canonical writers.
- `preparePersonnelWork` supports controlled-person private recruitment
  questions or review preparation about their actual work relationship.
  It creates an ordinary history event and private canonical Work item.
  Employment, compensation, money and time remain unchanged. Repeating the same
  preparation is idempotent. Another person's work stays inaccessible.
- `CivilPersonnelPanel({world,onWorldChange})` is a feature-local preparation
  component. The root retains the only World and save owner.

`node --import tsx scripts/compile-civil-personnel.ts --check` is the generated
projection replay gate; omit `--check` to regenerate. This is a focused replay,
not a repeat of the accepted national source audit.

## Scope accounting and remaining dependencies

Measured current coverage: 51 records, 29 known fields, 481 unknown fields,
15 acquired first-party artifacts. Federal has 9 known fields, Alaska 8,
Minnesota 8, Nebraska 4. Every one is projected; there is no handpicked display
subset or assumption that the identity envelope represents 51 complete regimes.

| Scope                   | Accepted consumer inputs                                                                          | Additional dependent-action requirements                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Federal                 | Classification, competitive appointment constraint, covered removal/appeal, all five labor fields | Exact appointing actor/instrument, selection/qualification/preference route, §7511 coverage/exclusions, operative date support and applicable review procedure    |
| Alaska                  | Classification, appointment/probation constraint, removal/appeal, four labor fields               | Actual appointing actor and personnel rules, class-specific appointment/probation/CBA terms, action category and promotional-probation exception, operative dates |
| Minnesota               | Classification, permanent-classified removal and non-CBA appeal, all five labor fields            | Appointing instrument and hiring requirements, permanent employee/class/CBA binding, applicable plans/procedures and operative dates                              |
| Nebraska                | Classification and three labor fields                                                             | Appointment/probation/removal/review rules and responsible actors remain uncompiled; missing strike text remains unknown                                          |
| Remaining jurisdictions | Stable identities and explicit unknown fields                                                     | Only the dependent field/action is unavailable; private preparation is still possible                                                                             |

The current corpus's `asOf: 2026-09-06` is an observation date. Its acquisition
records describe retrieved editions. This checkpoint does not invent an
effective interval or transform the matrix's repeated research date into one.
No new legal fact has been promoted. Additional instrument acquisition and
class/authority binding are outstanding work, not an assertion that supported
public personnel gameplay is prohibited forever.

## UI delivery and acceptance tracking

UI owner: task `01a083ce-50dc-7773-95b6-63d6bed75af8`.
LIFE: `01a0837f-1d30-79e3-ab6f-15af6778d238`.
EXEC: `01a08380-1df9-7670-a18f-6443bbe433f8`.
CAREER was notified to keep public jobs out of its civilian offer allocator.

`civil-work7-ui-registration.patch` is an exact incremental patch against the
UI head above. It mounts the preparation component beside LIFE in Day and
ordinary Work. UI alone applies this patch; this branch has not edited
`PlayerGame`, `App`, navigation, LIFE or EXEC repair files. A normal-route test
patch is delivered separately. Published application is recorded below;
normal-route proof remains pending.

`tests/e2e/civil-personnel.spec.ts` is explicitly an isolated component proof,
with actual pointer/keyboard activation and canonical snapshot round-tripping.
It is not normal-player reachability or a lawful personnel journey.

UI reported published adoption of the frozen feature code
`4d4de94b7c9d69fe88144110b9b16d07a8425a93`, registration and delivered normal test
at `2da3404325b1041cde2bdcb0c22bd8b79a6cb3da` on PR #144. The unchanged
registration patch was also locally checked against its intermediate
`ff82c80b342b006a652c8d8b76cf92ef6e6ab579` head. Application is therefore
recorded; normal-route browser proof remains pending. The UI owner's reported
combined typecheck/lint/corpus pass is inherited evidence, not a local rerun.

## Personally executed verification

- Focused source and consumer tests: 18 passed across four test files. These
  include the retained source-domain tests, projection replay/corruption,
  class/date/CBA boundaries, unknown-jurisdiction preparation and snapshot
  preservation. This was not a repeat of P1A's full independent audit.
- `node --import tsx scripts/compile-civil-personnel.ts --check`: passed.
- Component Playwright: one test passed with one worker on isolated port 4267,
  run `civil-work7-final-component`, code freeze `4d4de94`. Pointer and
  keyboard actions create private Work and snapshot round-tripping preserves it.
  Earlier harness module-loading and locator failures were corrected before
  this passing run. Localhost required sandbox escalation, which was approved.
- `npm run typecheck`: passed on the frozen code. The earlier test-support
  include-path error was corrected without editing shared TypeScript configs.
- Feature-file ESLint, Prettier checks and `git diff --check`: passed.
- Required `npm run validate:art`, `npm run inventory:art`, and
  `npm run qa:art`: passed; no art diff was produced.
- Exact registration patch application check: passed against both pinned UI
  versions noted above.

No full `npm run validate`, production-build, normal-player browser, human
visual, or legal-personnel-journey pass is claimed. The finite heavy-test slot
was released explicitly to EDU after all CIVIL runners exited.

**Unmet acceptance:** real public recruitment/appointment, probation completion,
discipline/removal, formal filing and review decisions through actually
authorized people; genuine positive personnel journey; matching negative
authority/class/date controls against an otherwise successful legal transition;
normal-route browser verification and human visual acceptance. The existing tests prove
preparation and conservative source boundaries only. A draft PR for this
checkpoint must not be described as completed CIVIL-WORK7 gameplay.

## Architecture compatibility and LEARN

Confirmed: source-to-runtime dependency direction; pure simulation; canonical
World/calendar/history/Work; separate employment and resource truth; stable
IDs; known versus unknown; no new score, registry, account or employment
allocator; no fabricated biography, consent, outcome, source date or authority.
Shared root integration was published by the named UI owner. Authority-bearing
actions remain dependent on the exact instruments/bindings above.

Durable lesson encoded in the action-assessment tests: a descriptive legal
profile and a provider type alias are not executable permission. A positive
preparation test must not be presented as a positive appointment/appeal test.
The source replay test also prevents a generated runtime projection from
bypassing locked-byte validation.
