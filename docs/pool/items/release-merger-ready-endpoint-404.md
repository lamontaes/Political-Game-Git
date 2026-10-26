---
id: release-merger-ready-endpoint-404
title: "Repair the merger readiness step that returns HTTP 404"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/merger-ready-endpoint
pr: #4782
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T18:16:09.652Z
---

**What.** The merger skill tells the merger to mark a checked draft ready through POST pulls/N/ccr/ready_for_review. GitHub returns HTTP 404 for that route, and the following merge request returns HTTP 405 because the PR remains a draft. Correct the documented readiness workflow using a supported operation and explicit ownership so locally green PRs can complete the already-authorized ready-and-merge sequence without weakening checks.

**Rules.** Ask why: use the actual endpoint error and GitHub documentation to identify the broken transition, rather than treating a passing local gate as permission to skip review. Preserve the ban on merging a PR authored by the merger and all changed-file checks.

**Done when.** A focused test or recorded API transition demonstrates that an eligible checked draft becomes ready through the documented workflow, and the merger can then merge it. The instructions consistently describe the supported API and its authorization, while preserving the local gate and morning check.

**Files.** .agents/skills/merger/SKILL.md, docs/pool/README.md

**Notes.** Found during the October 16 merger pass. PRs #4637 and #4643 pass their applicable local checks but remain drafts after the prescribed endpoint returns 404. Their merge requests return 405 (Pull Request is still a draft). The current skill also says gh api REST only; resolve that instruction consistently with the chosen supported readiness operation.
