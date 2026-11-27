# What ships

The production Vite build writes `dist/shipped-files.json` next to the client directory, so the inventory itself is not part of the client. The file records source IDs per emitted chunk or asset, inlined assets and the public files Vite copies.

To refresh this repository snapshot, build the client and stage the Play API inventory in the same checkout.

```sh
npm exec -- vite build
PLAY_API_SHIPPED_FILES="$PWD/test-results/play-api-shipped-files.json" node desktop/scripts/build-play-api.mjs
node scripts/cleanup/repo-sort.mjs
```

The JSON puts each tracked path in one bucket. Shipping paths take precedence over build and test paths. The shipping bucket uses both observed Vite builds, copied Play API runtime files, and the desktop shell and Sites worker packaging routes. Game source, tests, development tooling, and their inputs count as build or test files when they do not ship. Crew instructions, active documentation, and records of the owner's words remain crew files. Retired proof screenshots and older reporting material are candidates in the last bucket. That bucket is not a deletion command. A deletion batch still checks for live references, active changes, and owner records.
