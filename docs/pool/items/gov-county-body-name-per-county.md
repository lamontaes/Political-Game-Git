---
id: gov-county-body-name-per-county
title: "A county's body takes its own recorded name (Texas: Commissioners Court), not its state's default"
area: gov
kind: bug
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found in #4422 (gov-body-named-by-member-title); stopgap SG-GOV-municipal-body-name"
---

**What.** A generated Matagorda County, Texas, body is "Matagorda County Board of Commissioners"; the real body is the Commissioners Court. Read each state's (and named county's) body name from the county reading, and a municipal charter's body name into the municipal reading.

**Rules.** One rule, all 56 places; estimate, never unknown; place facts live in data.

**Done when.** A drawn county's and town's bill clause names the body as its law does; SG-GOV-municipal-body-name closes.

**Files.** src/core2/gov-rules/county-governing-body-rules.ts, src/core2/gov-rules/municipal-governments.json, src/core2/offices-local.ts

**Notes.** Research request municipal-governing-body-names-and-member-titles in docs/research/roadmap-research-requests.md.
