# Episode: a sponsor counts votes to override a veto and comes up short

Slug `veto-override-whip`. Scene researcher C, Oct 27, 2026. Item `scene-veto-override-whip` (lead: director). Calibration only: no real name or quoted line is in any player-facing file. No code in this packet.

## For the builder (director format)

1. **Trigger.** `veto-override` (written by `executiveDecision` in `src/core2/modules/legislature.ts`, around line 3868). Facts: `billId`, `number`, `passed`, `sponsorId`, `executiveId`, `tallies`. Real record, Naval Academy, Maryland, seed `ov-c-3:0` (drawn from `ov-c-3`), 365 days: `veto-override:bill:office:US-MD:legislature-lower:2025-01-23:official:term:seat:US-MD:lower:005:2:2025-01-20:7`, number `HB 6`, `passed: false`, tallies `58/95/141` (yes, needed, seats). The same world wrote 3 overrides; Pocasset, Massachusetts (`ov-c-3:1`, `S.2`, 1/27/40) and Watch Hill, Rhode Island (`ov-c-3:2`, `S 33`, 6/25/37) each wrote one that failed. Its sibling `executive-action:<same bill id>` (action `vetoed`) is the veto it answers.
2. **Place kind.** The chamber floor or the hallway behind it before the vote. The record carries no `chamber` fact; the tallies name the office (`office:US-MD:legislature-lower`). Setting `chamber` needs the record to say it (see gaps).
3. **Cast rule.** The record's `personIds` hold only the sponsor and the executive (2 persons). The people who decided it are the members with an override vote row: table `votes`, id `vote:<billId>:<memberKey>:override`, with `vote` yes/no/abstain/absent and `position.total` (their reasons, summed). The scene is the sponsor and one member whose override vote was `no` or `abstain` and whose position sits closest to zero (the most movable); the sponsor asks, before the vote. For the player as a member of that body, the sponsor asks the player. For the player as sponsor, the player asks the movable member. Nobody is cast who is not on a vote row.
4. **Outcome record.** The reply is a `scene.reply` (existing writer, `replyInScene`). Today nothing reads it. The override vote is already taken by the time the record exists, so the scene is about the next try or the next bill: the reply should write a `favor-owed` or `strain` against the member's tie, which the member's next vote on the sponsor's bills reads as a recorded reason (`positionOn` in the legislature). That read does not exist: engine item filed (below).
5. **Lines.** Drafted for the words lead in the item Notes, not here.

## Source (read for substance, nothing copied)

State-capitol news of failed overrides, found Oct 27: a Louisiana concealed-carry bill whose override fell three votes short after three senators who had passed it switched; a Colorado social-media bill whose override vote was laid over until after the session so members need not vote against it; a Nebraska needle-exchange veto sustained at 27 of 30 votes needed, though the bill once drew 39; a Nebraska 2014 hunting veto whose sponsor believed he had the 30. (coloradosun.com 2025/04/28 veto-override-fails; yahoo.com "Failure to override Nebraska governor's veto is more about politics than policy"; washingtontimes.com 2014/apr/3; mississippitoday.org 2026/04/15 legislature-fails-override-vetoes; adn.com 2026/06/23.)

## Packet (the moment)

1. The legislature passes a bill. The executive vetoes it.
2. The sponsor counts: the bill passed with room, but an override needs far more than a majority, and some who voted yes did so knowing it would be signed.
3. The sponsor goes member by member, in the hallway and by phone. Most say yes. A few say they voted for it but will not cross the executive.
4. One of those, who owes the executive for a project in their district or fears a primary, says what they will not say publicly: the vote was for the district, the override is for the party.
5. The member's choice: stay with the executive, switch, or be absent for the vote.
6. The vote fails by a handful. The sponsor says they will bring it back next session; the paper writes that the sponsor "came up three votes short."
7. After: a member is owed or owes; the sponsor remembers who switched.

## Played-world check

| Line                    | Record                                         | Fires today?                                                                         |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1 veto                  | `executive-action` (vetoed)                    | yes: `veto` type, sponsor only (1 to 3 scenes in 365 days against 4 to 13 overrides) |
| 2-3 override count      | `votes` rows with `override: true`, per member | records exist, **no situation type reads them**                                      |
| 4 member's reasons      | `position` on each vote row                    | exists, unread                                                                       |
| 5 switch or absent      | `vote` yes / no / abstain / absent             | exists, unread                                                                       |
| 6 fails and is reported | `veto-override` news true                      | exists; `veto` type covers the sponsor only                                          |
| 7 who owes whom         | `scene.reply` and the tie                      | write exists; **no engine reads the reply at a later vote**                          |

## Gaps

- **Producer (director):** a `veto-override` cause that casts a movable member from the vote rows. Item `scene-veto-override-whip`.
- **Record (laws-effects):** `veto-override` names only the sponsor and executive and has no `chamber` fact or movable-member list; and nothing reads a `scene.reply` at the next vote. Item `laws-override-record-names-members-and-reads-replies`.

## Other episodes the same producer covers

A mayor's veto of a council ordinance with a two-thirds override (same record kind at city level); a governor's line-item veto (`item-veto`) and the appropriations chair asking the members who voted yes to hold.
