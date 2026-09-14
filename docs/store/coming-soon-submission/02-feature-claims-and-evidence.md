# Feature claims tied to evidence

Three layers are kept distinct. Steam’s store-presence review requires that listed features be in the launch build, or clearly marked as not yet released.

## Layer A — Public main `f22fd314e72bec0440044026ccdfd99e7a67600d`

Fetched from `origin/main` on 2026-09-14. This is the published Git head, not the private combined Play and not the installed Mac build.

| Player-facing claim | Internal evidence | Store use |
| --- | --- | --- |
| Title is Our Civic Duty | `src/player/TitleScreen.tsx` wordmark | Yes |
| New Game / Continue / Options title flow | Title screen; Play-first guidance merged in #240 | Yes, as current capability |
| Creator: “Where are you from?”, birthday, alphabetical hometown (no Lexington priority) | Merged #246 / #243 / #238; D33-15, D34-02 | Yes |
| Scene-first rooms using released environment plates | Production scene modules; runtime-released families under `art/families/` | Yes as environments; people art not final |
| Save / export-import of a life | `SaveTransferControls.tsx`; D21-32 | Yes as save continuity intent; browser vs desktop saves do not auto-merge (`desktop/README.md`) |
| Study terms / Personal tuition continuation | Merged #244 | Yes as supported education terms, not a lesson-click simulator |
| Nine structurally different state legislative rule packs | `src/simulation/legislature-rule-packs.ts` (`us-ky`, `us-ne`, `us-ak`, `us-mn`, `us-il`, `us-md`, `us-mo`, `us-nv`, `us-oh`) | Say “supported state legislatures,” never “all 50” |
| Municipal inventory exists; admitted municipal packs = 0 | `MUNICIPAL_RULE_REGISTRY_META`: `inventoryGovernments: 144`, `admittedPacks: 0` | Do **not** claim playable municipal governing packs |
| Canonical version field exists; package.json still `0.2.0` | `package.json`; D33-18 | Do not advertise 0.2.0 as the Coming Soon marketing version until release machinery stamps a public identity |
| Desktop Mac/Windows packaging path exists | `desktop/README.md`; updater disabled | Platform checkboxes are an owner decision; do not tick Linux/Steam Deck |

## Layer B — Identified combined candidate (A / PLAYTEST34)

Board-identified private composition `2b8237a19dd1eceaa43ba96eb186327e0b224349`, Play `5275`, served digest `5e249a767ffea99e04381126875859be54b7ac0b2ec45fc46b07c5d437b28611`. **Not on this cloud checkout. Commit was not found on GitHub.** Treat as A-owned local evidence.

| Claim | Board/GitHub evidence | Store use until A captures it |
| --- | --- | --- |
| Quiet Begin, Save, reload, CONTINUE | Board PRIMARY PLAY receipt | Allowed in long description as current development play; screenshots must come from this build |
| Named family labels (Mom/Dad), People search | Board video-review correction: already exist | Yes if A’s shots show them |
| Saved NPC proposal/favor; talk time-free; activity time once | #247 `def933cf` published; A Mom 30-once / favor 20-once receipts on 2b | Describe as in the identified Play, not as landed main until merged |
| Options external JSON content pack (authored encounter, missing-pack refusal) | Board FOUNDATION on 2b; not a second World | Describe as **planned / in development** on the public page unless launch will ship it. Do not tick Steam Workshop |
| Candidate people art (`?art-preview=candidate`) | Desktop README: production Steam builds refuse this flag | **Do not** use candidate-art screenshots on a public store page unless the owner chooses an internal-art-review look. Prefer production compositor |

## Layer C — Planned / in progress (label as not released)

| Topic | Decision / PR | Public wording |
| --- | --- | --- |
| First public governing milestone | D21-33: affect local/state/national government through legislation as legislator or executive; judicial not promised | Long-description “intended first public milestone” |
| Campaign recovery, result→term→office | #249 `f8128d0a` open, mergeable; fixture-supplied parts remain | Planned / in review, not a store feature checkbox |
| Elected executive work + public aftermath | #248 draft `cbec7059`; ordinary governor candidacy producer still missing | Planned |
| Legislative instruction consumer | #237 draft with conflicts; unfinished `legislative-bargaining-actions.ts` | Planned |
| Municipal citizen attendance / member action | REST37-M; 0 admitted packs on main | Planned; unknown until admitted |
| Paid public-account service | REST37-F/T local, not primary Play | Planned |
| Operative constitutional/charter change in one save | REST37-K | Planned |
| Community mods like RimWorld/The Sims | D33-17: start with a practical pack seam, not a universal framework | “Supported extension packs planned”; never “unlimited mods” |
| Automatic desktop update | #242 draft; native permission unanswered; updater unconfigured | Not a Coming Soon feature |
| Poses / painted people | D34-01, D21-03; STYLE35 not human-approved | Appearance in progress |
| Audio / Steam Deck / controller | D21-07 no AI music; P21-05 undecided | Do not tick |

## Steam feature checkboxes — only if launch will actually include them

Recommend **checked now** only:

- Single-player
- Family Sharing (Steam default unless owner opts out — owner decision)

Recommend **unchecked** until implemented:

- Multi-player, co-op, MMO, PvP
- Steam Achievements, Cloud, Workshop, Cards, Leaderboards
- In-app purchases, Steam Wallet commerce
- VR, HDR, ray tracing
- Mods (as a Steam feature) / Steam Workshop
- Controller / Full controller support / Steam Deck (P21-05)
- Includes level editor

## Explicitly never claim

- Complete 50-state play
- Complete pose set because a schema exists
- Unlimited mod scripting
- Live/runtime generative AI
- Final human-approved character art
- That Lexington is the normal-start default
- That 144 municipal inventory rows are playable governments
- That public main is the identified Play
- That the installed private Mac build (`6e` / version 0.2 on the board) is this packet’s screenshot source
