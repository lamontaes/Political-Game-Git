---
id: release-skill-frontmatter-real-yaml
title: "The skill tests read frontmatter with a YAML parser and refuse unknown keys"
area: release
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/long-game-skill-yaml
pr: #9872
after:
blocked-on:
source: the CTO's must-hold checks for Long game, item 2, on issue 9747 (Nov 17, 2026, 05:22Z)
lead: speed
standard: 2
model: opus
effort: medium
root: none
claimed-at: 2026-11-17T06:05:00.000Z
---

**What.** Four skills shipped frontmatter that was not valid YAML, and the skill tests passed them (#9777 fixed the four). A misspelled frontmatter key would do nothing, because Claude Code ignores unknown keys without an error.
Seen: #9777, and the CTO's 05:22Z comment on issue 9747.

**Cause.** Found in code: `frontmatter` in `scripts/skill-ops/skill-ops.test.ts` splits the block into lines and reads `name:` and `description:` by prefix, so an unquoted value with a colon and a space, which YAML refuses, passed; nothing reads the other keys.

**Fix.** `frontmatter` parses the block with `js-yaml` (`load`), now a direct dev dependency, and returns its keys; the frontmatter test refuses any key not on Claude Code's list (code.claude.com/docs/en/skills, "Frontmatter reference"). The description bound stays 41 to 1,024 characters. The player sees nothing.

**Time box.** 1 hour.

**Rules.** None of the standing rules apply beyond the skills rules in AGENTS.md (frontmatter `name` and a `description` of 41 to 1,024 characters).

**Done when.** A second session adds `allowed_tools: Read` to a skill's frontmatter on a scratch branch and sees `npm run test:skill-ops` fail naming that skill and the key, then sees it fail again on an unquoted description containing ": ". No place is drawn: the check reads files, not a played world.

**Waits on.** Nothing.

**Files.** scripts/skill-ops/skill-ops.test.ts, package.json, package-lock.json

**Notes.** Break-it: the 46 skills as they stood before #9777 (b6273d03ee^) give exactly four YAML failures under the new parser (legislation-screens, merger, press-desk-reach, speech-planner), the four #9777 fixed.
