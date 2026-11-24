---
id: talk-stranger-asked-how-things-are-tells-the-eviction
title: "A stranger the player asks how things are tells the eviction (a stranger never volunteers it)"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead, Nov 14, 2026, from #9120 (eviction talk carry) and the Words lead's tie ruling (/mnt/project-files/words-lead/held/eviction.md)"
model: opus
effort: medium
root: rc3-thin-life-record
checked: account lead 2026-11-14
---

**What.** Under the tie ruling a stranger does not volunteer an eviction, so a filled-in person from an evicted household (the common case, #8477) never tells it unless they already know the player. The player has no plain way to ask a stranger how they are. Seen: in drawn worlds at Terminous CA, Scott City KS and Lily Lake WI (seeds final9120a:0 to :2 in the proof script) every evicted stranger's talk opened with a greeting and then the news or their name, with no eviction line and no reply choice to draw it out.

**Cause.** Design: docs/design/story-director.md and the Words lead tie ruling. In code, `evictionSubjects` in src/director/conversation.ts returns nothing for a person who is neither close nor an acquaintance (`!close && !saysName(...)`), and the player's reply set (src/director/data/conversation-rules.json, `replyMoves`) has no ask-about-them move that opens an untold hard-news subject. The ruling wants a stranger to tell it only when asked.

**Fix.** Add one player choice, "How are you doing?", offered in any talk where the other person holds untold hard news, that raises the subject as a guarded line ("Not great." then the fact on "What happened?"). It reuses the guarded wording and replyMoves of the acquaintance talk. Wording comes from bank pieces by the Story session; no new engine.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One conversation engine; no hand-written player text in code; plain American English; no count or status line in the talk.

**Done when.** A second session, in a drawn place with its seed named, asks an evicted stranger "How are you doing?" in the running game and hears the guarded line, then the fact on "What happened?", with the person's own household record named.

**Waits on.** #9120 on the train.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json
