# Pending change declarations

One file per change, named `<change-id>.md`. Create one with
`npm run release:declare -- <change-id>`.

The release consumes and deletes them. See [../README.md](../README.md) for the
format and the rules. Fresh post-rollout eligible changes must add or update a
declaration; source-only work uses explicit `impact: none`.
