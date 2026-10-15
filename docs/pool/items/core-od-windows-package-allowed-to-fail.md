---
id: core-od-windows-package-allowed-to-fail
title: "Owner decision: The Windows package job (and the Windows build in each release) may fail without failing the checks or blockin"
area: core
kind: owner-decision
priority: 2
status: done
claimed-by:
pr:
blocked-on:
milestone:
source: "stopgap SG-PLAY-windows-package-allowed-to-fail"
---

**What.** Question for the owner: Early-access preparation: the Windows job made green and required again, and every release carrying latest.yml.

**Rules.** Look before you ask: quote DECISION-REGISTER.md and OWNER-DECISIONS.md first. Build the simplest version meanwhile.

**Done when.** The owner rules; the stopgap row resolves.

**Files.** .github/workflows/desktop-package.yml

**Notes.** DECIDED. OWNER-DECISIONS.md: 'The Mac package is the one that must pass; the Windows row stays allowed-to-fail until early access.' BOARD.md: 'Windows may stay red until early access.'
