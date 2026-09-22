# Party chapters reach every town walked, and a claim I nearly filed

**Walked** 2026-09-22 on `claude/playtest-cwpd3o` at `9a06fd9f`, Chromium 141
(not CI's browser). Ordinary lives, age 34, first morning, no campaign filed.

## The measurement

Politics ▸ Parties, six towns, one life each:

| Town                  | Party section | Ask controls | Named chapters                                                                                                                |
| --------------------- | ------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Springfield, Illinois | yes           | 6            | County of Sangamon Democrats, with Christian Leonard; County of Sangamon Republicans, with Chloe Woods                        |
| Boise, Idaho          | yes           | 6            | County of Ada Democrats, with Dakota Guerrero; County of Ada Republicans, with Paul Shepherd                                  |
| Phoenix, Arizona      | yes           | 6            | County of Maricopa Democrats, with Ramon Garza; County of Maricopa Republicans, with Aria Lewis                               |
| Augusta, Maine        | yes           | 6            | County of Kennebec Democrats, with Melanie Juarez; County of Kennebec Republicans, with Dylan McLeod                          |
| Nashville, Tennessee  | yes           | 6            | Nashville-Davidson metropolitan government (balance), Tennessee Democrats, with Nikhil Barnett; …Republicans, with Donna Ruiz |
| Baltimore, Maryland   | yes           | 6            | Baltimore, Maryland Democrats, with Jonathan Ward; Baltimore, Maryland Republicans, with Richard McClain                      |

Six for six. Real counties per state, two chapters each, a named organizer
each, and the same six ask controls everywhere. `parties-none` — the "No local
party chapters are recorded where you live" note — did not render in any town.

Confirmed at the world level too: `homePartyChapters` returns 2 for every one
of these towns in a freshly opened life.

**So the party layer is state-agnostic.** It does not wait on a state's
elected offices having been read, which the four towns here that still print
"The game has not read this state's elected offices yet" demonstrate while
carrying full chapters.

## The claim I nearly filed, and why it was wrong

An earlier probe in this same session counted the ask controls on **Campaigns**
rather than **Parties** and found six in Springfield and Baltimore and zero in
Boise, Phoenix, Augusta and Nashville. I had a document written saying four of
six towns have no party at all, with a table, a correlation against the
offices-not-read sentence, and a paragraph about what it would mean.

Every number in it was real. The conclusion was false, because the section
lives on Politics ▸ Parties (`PlayerGame.tsx`, the `"parties"` workspace) and
the Campaigns surface mounts the same panel only in some cases. Reading one tab
and naming the other is the failure this lane has already paid for more than
once: **a route a probe takes is not the route a player takes.**

What saved it was checking the world before writing the cause down. The
chapters were there in every town, which contradicted the screen reading, and
the contradiction was the signal.

## What is actually open

**A small presentation inconsistency.** "Party and community work" appeared on
the Campaigns surface in Springfield and Baltimore but not in Boise, Phoenix,
Augusta or Nashville, with no campaign filed in any of them. The code comment
says Campaigns mounts that panel for a candidate already running, which none of
these were. Worth a look; it is a duplicate-placement question, not a missing
feature, and nothing is unreachable because of it.

**A prose wart, measured not guessed.** Nashville's chapters are named
"Nashville-Davidson metropolitan government (balance), Tennessee Democrats".
That is the local-government record's own name used verbatim as a party's name.
It is accurate and it reads badly on a player-facing surface, particularly the
parenthetical.

## What this does not establish

- Six towns, one life each, one age, one seed per town.
- Nothing about whether attending these meetings does anything, which is a
  separate claim and untested here.
- Whether the Campaigns-surface difference is deliberate.
