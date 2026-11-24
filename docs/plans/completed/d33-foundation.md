# D33 FOUNDATION: first runtime content-pack increment

Authority: current DELIVERY28 RECEIVE-NOW / DIRECTOR33 FOUNDATION and D33-17.
Base: public main `0f81acb6fa430c540a61a884cf4ff4ca850307f0`.
Owner: one isolated FOUNDATION worker; A owns composition and publication.

## Source-grounded migration map

| Current consumer                                      | Existing primitive                                                                               | Missing contract / change                                                                    | Scope and persistence                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `life-scene-flow.ts`                                  | `LifeSceneDefinition`, `eligibleEpisodeBeats`, `playEpisodeOption`, canonical minute advancement | Extract the existing scene-to-family compiler; combine built-in and per-life external scenes | Small adapter extraction, existing event/knowledge writers unchanged                                                                   |
| `content-bank.ts`, `content-registry.ts`              | Descriptive review index                                                                         | Separate pure runtime data registration; descriptive index stays read-only                   | Additive runtime module; no import from simulation to review index                                                                     |
| `World`, `assertWorldIntegrity`                       | One JSON-safe World and ordered history                                                          | Optional embedded immutable packs, exact API/version/dependency/order/content identity       | Cross-cutting additive field; original no-pack Worlds unchanged                                                                        |
| `serialization.ts`, browser/portable/SQLite receivers | Existing integrity-checked codec                                                                 | Format 16 only for pack-bearing lives; continue format 15 for no-pack lives                  | Old binaries refuse packed lives. New codec reads original format 15 unchanged. Missing/incompatible data refuses before writable load |
| A's normal menus                                      | Existing on-demand feature leaf and `onWorldChange`                                              | File import leaf; current scene engine offers added content                                  | A-only root mount, no permanent action panel                                                                                           |
| T/F/S transit                                         | T026c7a39 already admits exact authored definitions and consumes F/S                             | Receive existing patch; ordinary paid revenue producer remains F-owned                       | No duplicate patch, no private combined-source publication                                                                             |
| N/S/M/K election/office                               | Existing contest result, actual office and prospective rules                                     | Exact owner adapters remain under existing writers                                           | No second World/election engine; do not grant term by inspecting a result                                                              |
| D accepted study terms                                | Existing enrollment snapshot and study resolver                                                  | D is extending ordinary degrees/grace/workload                                               | No simultaneous edits to D's terms modules                                                                                             |

## Delivery boundary

First externally imported JSON ordinary scene uses the same compiler and episode
writers as first-party scenes. A distinct fictional timing-settings pack may
provide a namespaced duration referenced only by newly imported scenes. It
cannot rewrite old scenes, law, a degree, or a person's existing history.
Pack versions are exact; implicit overrides and in-place replacement refuse.
Definitions are embedded in each life, with deterministic dependency order and
reproducible canonical content identity. No external file must remain on disk to
reopen that life. Corrupt/missing/incompatible embedded definitions fail closed.
No script, archive, filesystem path, remote asset or arbitrary behavior support.

Broader migration requires domain-owned definition resolvers for education,
offices, operative law, art, and existing mutable global catalogs. Behavior mods
also require a separately reviewed isolated command/event capability bridge and
scoped persistent state. Neither is claimed by this small data seam.

## Bounded source delivery

The local runtime increment is implemented. Focused pack parsing/dependency/
refusal tests, ordinary scene action/time/history and serialize/reopen tests,
independent lives and no-pack snapshot compatibility passed. See
`docs/integration/d33-foundation-to-a.md` for exact checks and source receipt.
The remaining root mount and ordinary pointer/keyboard import route belong to A;
they are not certified by this completed source increment. No public publication
or installation by this worker.
