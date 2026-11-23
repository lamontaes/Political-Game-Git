# Carryover: what the owner said on Nov 8, 16 and 17 that isn't done

Written by the CTO on Mon Nov 23, 2026, 6:25 p.m. Eastern, at the owner's request: "Go through the last few playthroughs and look at everything I've said, and then look at everything that's been merged into the game since then. I want those going to the coordinator as well. Remember, nothing with English yet."

## Where this comes from

**The sittings:**
- Nov 8 (v0.94.0): P1 to P41 in his words and C1 to C33 caught.
- Nov 16 (v0.112.0): 70 stops, from his recording and his words.
- The Nov 17 rulings, after he played v0.113.0, and the CTO's replay of the Nov 16 stops on v0.113.0.
- Rows already in tonight's sitting (`2026-11-23-1.md`) aren't repeated here.

**What it was checked against:**
- Everything merged between v0.112.0 and v0.114.0 (1,278 commits).
- The 164 open PRs and the pool.
- The Nov 19 inventory of 1,684 branches, 119 of them with no PR and not in main or a train.

**Status words:**
- **Open:** nothing merged touches it.
- **Stuck PR:** a PR aimed at it never landed. Read the diff, then land it on main or close it.
- **Merged, confirm:** a merged change aims at it, but nobody has played it since.
- **Seen Nov 23:** still broken in v0.114.0 tonight.
- Words from Nov 16 are quoted; "[not mentioned]" means the CTO caught it on the recording.

## Rows for the Coordinator's lanes (no English)

| Row | What he said or what was seen | Status | Lane |
| --- | --- | --- | --- |
| N16-38 | "Why is Christina Hale here? She should be smaller since she isn't talking." (Nov 17 ruling: silent people never shown big) | Stuck PR #9997 (mergeable, untouched since Nov 18); seen Nov 23 | 1 |
| N16-42 | "There's one person, shorten the strip." (Nov 17 ruling: the strip shrinks to its people) | Stuck PR #9997; seen Nov 23 (P20) | 1 |
| N17-20 | Travel listed "Grano, North Dakota retirement-income paying account" as a place | Stuck PR #10007 (aimed at train/nov18) | 1 |
| N16-14 | "Words should be popping up here." The loading bar and steps | Steps show (Nov 23). Stuck PR #9795 (the warm-up's loading bar moves with each day) | 1 |
| N16-1 | "each game, it should start with new ones" (title paintings) | Merged "many title monuments", confirm. Stuck PR #9768 (fresh paintings and faces each game): read it, land or close | 1 |
| N16-16 | The loading backdrop shows another state's capitol [not mentioned] | Seen Nov 23: New Jersey loaded over a capitol with mountains behind it. #9768 aims at it | 1 |
| N16-53, N16-54 | "A massive just hole right here." "this isn't the textured background or whatever I approved" | Merged "person card fills the panel"; seen Nov 23 (C17, right half empty) | 3 |
| N8-P34 | A council member's card "doesn't even look like the page I approve" | Seen Nov 23 (P25, two layouts) | 3 |
| N16-9 | The portrait goes blank while the look changes [not mentioned] | Open | 4 |
| N16-12 | "lots of empty, dead space right here" (the creator) | Open; Nov 17 ruling: no empty space in the creator | 4 |
| N16-13 | "I'm not sure if this border is what I approved" (the creator) | Open | 4 |
| N16-21 | Developer text in the Guide, and the Guide covers the scene [not mentioned] | Open | 4 |
| N16-24 | "I didn't even get to see the journal stuff there." (the pop-up vanishes) | Open; goes with Nov 23 P20 | 4 |
| N16-44 | A phone caller stands in the room [not mentioned] | The call words merged; the staging is open | 4 |
| N16-49, N16-50 | Morning or "early" text with sunset light | Open | 4 |
| N16-52 | The school is "Open now" at midnight, and the wrong name is shown [not mentioned] | Open | 4 |
| N16-58 | "it's squished right here. Why?" (an office name on Politics) | Open | 4 |
| N16-65 | Raw developer text in Issues [not mentioned] | Open | 4 |
| N16-66 | A cut-off budget label; heads on only some rows [not mentioned] | Open | 4 |
| N16-67 | "I can't click the story" and "there's nothing on the street signs" | The reader opened stories on Nov 23; the blank street signs are open (art) | 4 |
| N16-68 | The outlet tabs: "not very intuitive, but this is the right approach" | Open (more outlets as tabs on Nov 23) | 4 |
| N16-69 | News events out of order; raw bill numbers [not mentioned] | Open | 4 |
| N8-P1 | The title background "will fade in, and then it'll fade in again" | Open | 4 |
| N8-P11 | "It's so small." The UI doesn't scale with the window, and the rail icons are tiny | Open | 4 |
| N8-P12 | News and Day glow on load for no reason | Open | 4 |
| N8-C17 | The Politics title text can be selected (a blue highlight) | Open | 4 |
| N8-P25 | "I hate this submenu stuff" ("Mine" on Parties) | Open | 4 |
| N8-P26, C19, C21 | "I don't like this issues menu." Statute text ("26 U.S.C. 1(a)-(d)"), cut-off labels, pagers | Open | 4 |
| N8-P28 | Budgets in The Political Process's style with real figures; no Courier fiscal-year font | Open (he liked the Budgets layout on Nov 8) | 4 |
| N8-P31, C23 to C25 | "this is not how it was approved" (Bills): 13 boxed buttons, cents on billions, "Decided: Failed" with no date or vote, a Back button | Open | 4 |
| N8-C32, C33 | The Journal page is half empty; the drop cap sits apart from its line | Open (the prose is Words') | 4 |
| N16-48 | Calendar "Coming up" starts with December [not mentioned] | Open; goes with Nov 23 P47 (blank) | 5 |
| N16-34 | "Oh, I'm getting a job offer? I didn't even apply for one." | Merged (an offer needs a contact or an application), confirm | 5 |
| N8-P30 | "no bill is before your state or Congress yet. That's not how it works... it's not being simulated" | Open; the pool's six "empty after a year" items (needs cause) are the same family | 5 |
| N8-P41 | Week speed: a Week took about 3 seconds, and he wants it faster | Open: time a Week on the replay, and on a slow one trace which steps take the time | 5 |
| N16-27 | "this TV thing needs a graphic made for it" (the Governor's address on TV) | Open | 6 |
| N16-39 | "a figure behind the desk" in the President's address | Waits on the Desk (Jan 20 question) | 6 |
| N16-43 | The Governor talks while the household is shown big [not mentioned] | Open | 6 |
| N16-62 | Impossible dates in politicians' stories [not mentioned] | Seen Nov 23 (C10, a mayor elected at 21) | 7 |
| N8-P17 | "Is selectmen... the right thing for this jurisdiction?" | Seen Nov 23 (C9, C12: New Jersey council and county offices) | 7 |
| N8-C20 | A state income tax shown at 43.99% (Connecticut is about 6.99%) | Merged "a state's income tax is the state income tax rate", confirm | 7 |
| N8-C22, C26 | "Correction" and "Intergovernmental expenditure" shown to the player; a town with "Higher education $0" | Open | 7 |
| N8-C28 | A bust that doesn't match the person's name or origin | Open | 7 |
| N8-P33 | "I'm Mexican and my son is white." | Merged (a child's look comes from both parents), confirm | 7 |
| N16-26 | "Every one of these paintings looks so low quality." | Open, art: no lane paints. Coordinator, propose who does it as a Q for the owner | Q |

## Merged, the Replay confirms (no build work unless the Replay finds it broken)

- **N8-P2:** patch notes as a list, not pages.
- **N16-3:** patch notes structure. On Nov 23 he said "the patch notes menu is good" except the scroll bars, which are in the Nov 23 rows.
- **N16-5:** developer text in patch notes.
- **N16-6:** the same busts every time. On Nov 23 he said the people change.
- **N16-7:** no person before a gender is picked.
- **N16-10 and N16-11:** skin and colors as swatches, hair as pictures.
- **N16-15:** the loading freeze.
- **N16-40:** the President standing in the living room. On Nov 23 he's on the LIVE set.
- **N16-41:** the narration card showing her again.
- **N16-47:** landing at midnight. On Nov 23 it was 9:00 PM.
- **N16-51:** Travel's variety.
- **N16-56:** a city council exists.
- **N16-57:** recent votes in a raw format.
- **N16-59 and N16-64:** nothing to run for. He announced on Nov 23.
- **N16-60:** learning about parties.
- **N16-70:** the Metrics pages he approved, without scrolling.
- **N8-P8:** the loading map.
- **N8-P10:** landing at 8:30.
- **N8-C5:** pop-ups during the address.
- **N8-C6:** the talk box piling up lines.
- **N8-C14:** races named by holder.
- **N8-C16:** a campaign tab after filing.
- **N8-C18:** letters in rings.
- **N8-P21:** "File for it" after filing (#9856).
- **N8-P24:** joining a party (#8453).
- **N8-P35:** a picture on a Journal chapter (#8468).

## English, held (not the Coordinator's; the owner said "nothing with English yet")

- **Nov 16:** N16-17 ("a hospital stay"), N16-18 to N16-20, N16-22 and N16-23 (the President's address), N16-25 (Christine's lines), N16-28 to N16-32 (the Governor's address), N16-33 (Lisa Cruz with no context), N16-35 and N16-36 (addresses nobody asked for), N16-37 (a journal line), N16-45 and N16-46 ("You stay in", twice), N16-55 (people's stories as facts), N16-61 ("His people").
- **Nov 8:** P9, P19, P20, P36 (Journal history), P37 to P39 (scenes), C7 to C9 (briefs read as records), C11 and C12 (the clerk's lines), C30 and C31 (Journal chapters).

## Open PRs, branches and leftovers (the full account, Nov 23 6:25 p.m.)

**164 open PRs, by base:**

| Base | Count | Notes |
| --- | --- | --- |
| main | 103 | 84 untouched since before Nov 19. The ones tied to a stop are named above; the pool hold covers the rest. |
| train/nov17b | 28 | Five were folded into train/nov18 (#10115, #10118, #10119, #10132, #10178) and close when #10279 lands. #10014, #10058, #10137 and #10259 are Words or home scenes. The rest touch no row. |
| train/nov18 | 8 | #10143, #10144, #10154 and #10007 are in lane 1. #10153 and #10160 were re-opened on main tonight as #10284 and #10282, so the old ones can close. |
| claude/story-cut-before-nov15 | 11 | Story's cut stack. Words, held. |
| Bases that already landed (`claude/project-thread-lhbwzt`, `-lhbwzt-train2`, `-tfo4nh`) | 5 | They can't land as they stand. #9537 and #9612 were on the Nov 19 close list. |
| Other claude/* bases | 9 | Story address and board stacks, and history-territory-legislatures. Held. |

**Closes (the owner said yes, Nov 23, about 6:40 p.m.):**
- **Closed by the CTO:** #9758 and #9775 (main already carries them) and #10160 (the same change is #10282 on main).
- **Already closed by its lane:** #10153 (now #10284).
- **Held until the Replay confirms Metrics:** #9787. If Metrics is right, it closes.
- **Correction:** the five PRs this file first listed "from the Nov 19 close list" (#10088, #9119, #9537, #9612, #9982) were the PRs that list said to keep or hold. The CTO read them wrong. They stay open; don't close them.

**Branches:** 119 branches had commits in no PR and in neither main nor a train (the Nov 19 inventory, on the CTO's Mac). By name, none carries a fix for a row above, except possibly two speed branches (`claude/speed-modulekey`, `claude/speed-campaign-lists`) for N8-P41. Nothing to do with them unless the Week-speed trace points there.
