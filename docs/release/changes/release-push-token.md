---
id: release-push-token
impact: none
---

The release workflow pushes the version commit with the owner's token when the `RELEASE_PUSH_TOKEN` secret exists, since branch protection refuses the workflow token; docs and workflow only.
