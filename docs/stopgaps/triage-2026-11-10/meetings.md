# Stand-in triage: meetings (Nov 10, 2026)

Owner test (Nov 10): kept 1 (with what the player sees), dropped 0 (too in depth), of which borderline 0.

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                        | Still true? | What closes it | Pool item | Size | May stay at early access?                                                                                                                                                                         | In plain words                                                                                                                                                                                               | Where the player sees it                         |
| ------------------------------- | ----------- | -------------- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| SG-MEETINGS-debate-no-moderator | still faked | code           | none      | S    | yes: the press is basic at early access (Oct 10 scope call); it only bites when every reporter, head and owner of the host outlet is in the race or gone, and the debate is still held on its eve | If nobody at the host newspaper is free to moderate a debate, the debate is held on the eve of the election with the player's filed platform as their answers, because the game will not invent a moderator. | The debate before an election he can win or lose |

## Evidence

- `SG-MEETINGS-debate-no-moderator`: src/core2/modules/meetings.ts:1209-1210 (debateAccepted returns without a sitting when debateModerator at line 1115 finds none); debateModerator reads only the outlet's reporters, head and owner; refreshPressStaff exists in src/core2/modules/press.ts:3460 but nothing here calls it or names a league/chamber host. Cheap: one lookup per accepted debate.

## Questions for the owner

None.
