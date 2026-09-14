# Feature claims tied to evidence

Internal notes. Do not paste this table onto the store page. Public wording lives in `01-store-copy.md`.

Three layers stay distinct. Steam store-presence review requires listed features to be in the launch build, or clearly marked as not yet released.

## Layer A — Public main `f22fd314e72bec0440044026ccdfd99e7a67600d`

Fetched from `origin/main` on 2026-09-14. Published Git head, not compiled33 and not the installed Mac build.

| Player-facing claim                                                                     | Internal evidence                                      | Store use                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Title is Our Civic Duty                                                                 | `src/player/TitleScreen.tsx` h1 `.front-door-wordmark` | Yes                                                                |
| New Game / Continue / Options                                                           | Title screen; Play-first guidance #240                 | Yes                                                                |
| Creator: “Where are you from?”, birthday, alphabetical hometown (no Lexington priority) | #246 / #243 / #238; D33-15, D34-02                     | Yes                                                                |
| Scene-first rooms using released environment plates                                     | Production scene modules under `art/families/`         | Yes as rooms                                                       |
| Save / export-import of a life                                                          | `SaveTransferControls.tsx`; D21-32                     | Yes as save continuity; browser vs desktop saves do not auto-merge |
| Study terms / Personal tuition continuation                                             | #244                                                   | Yes as supported education terms                                   |
| Nine structurally different state legislative rule packs                                | `src/simulation/legislature-rule-packs.ts`             | “Supported legislatures,” never “all 50”                           |
| Municipal inventory 144 / admitted packs 0                                              | `MUNICIPAL_RULE_REGISTRY_META`                         | Do not claim playable municipal governing packs                    |
| Canonical version field; package.json still `0.2.0`                                     | `package.json`; D33-18                                 | Do not advertise 0.2.0 as the Coming Soon marketing version        |
| Desktop Mac/Windows packaging path                                                      | `desktop/README.md`; updater disabled                  | OS ticks are an account decision                                   |

## Layer B — Identified combined candidate compiled33

Board PRIMARY PLAY: compiled `33a1ced1cb0aae7ab8985cc18895ba700db34428`, last author-verified Play `5277`, recovered UI36 + painted ep35 + N249. **Not on this cloud checkout.** Historical private Play `2b8237a19dd1eceaa43ba96eb186327e0b224349` at 5275 is superseded. Do not recapture from it.

| Claim                                                                | Board/GitHub evidence                                                                   | Store use                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quiet Begin, painted people, full footer                             | Board compiled33 receipt                                                                | Screenshots must come from this build (or an explicitly named successor)                                        |
| Named family labels (Mom/Dad), People search                         | Board video-review correction                                                           | Yes if A’s shots show them                                                                                      |
| Saved NPC proposal/favor; talk time-free; activity time once         | #247; A receipts                                                                        | Describe as current combined play                                                                               |
| Options JSON content pack (authored encounter, missing-pack refusal) | Board FOUNDATION on the combined Play; same World                                       | **Current limited pack support**, not Workshop, not unbuilt                                                     |
| Internal-art-review / `?art-preview=candidate`                       | Production Steam builds refuse the URL flag; compiled33 is the internal-art-review tree | Store shots should show the painted people that compiled33 actually serves, not the older production compositor |

## Layer C — Planned / in progress (label as not released)

| Topic                                               | Decision / PR                                                                                                        | Public wording                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| First public governing milestone                    | D21-33: affect local/state/national government through legislation as legislator or executive; judicial not promised | Long-description “where the first public game is headed”                              |
| Campaign recovery, result→term→office               | #249 open                                                                                                            | Planned                                                                               |
| Elected executive work + public aftermath           | #248; ordinary governor candidacy producer still missing                                                             | Planned                                                                               |
| Legislative instruction consumer                    | #237 unfinished adapter                                                                                              | Planned                                                                               |
| Municipal citizen attendance / member action        | REST37-M; 0 admitted packs on main                                                                                   | Planned                                                                               |
| Paid public-account service                         | REST37-F/T                                                                                                           | Planned                                                                               |
| Operative constitutional/charter change in one save | REST37-K                                                                                                             | Planned                                                                               |
| Community creation like RimWorld/The Sims           | D33-17: start with a practical pack seam                                                                             | Broader community creation planned; current JSON pack is the seam, not unlimited mods |
| Automatic desktop update                            | #242; native permission unanswered                                                                                   | Not a Coming Soon feature                                                             |
| Poses / painted people as final art                 | D34-01, D21-03; STYLE35 not accepted                                                                                 | Appearance still being painted                                                        |
| Audio / Steam Deck / controller                     | D21-07 no AI music; P21-05 undecided                                                                                 | Do not tick                                                                           |

## Steam feature checkboxes

Recommend **checked now** only:

- Single-player
- Family Sharing (Steam default unless the account opts out)

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
- Unlimited mod scripting or Steam Workshop
- Live/runtime generative AI
- That appearance is finished
- That Lexington is the normal-start default
- That 144 municipal inventory rows are playable governments
- That public main is compiled33
- That the installed private Mac build (`6e` / 0.2 on the board) is this packet’s screenshot source
- Fabricated political actions in screenshots
