#!/usr/bin/env bash
# Re-runs the press.ts split (World item 4) on an unsplit press.ts.
#   scripts/world/press-split.sh [<ref holding the unsplit press.ts>]
# From the repository root. With no ref it splits the press.ts in the working
# tree, and refuses if that file is already split (under 1,000 lines). To redo
# the split on this branch, pass the ref before it (the PR's base), e.g.
#   scripts/world/press-split.sh origin/world/5-counted-news-field
# After other branches land, merge them first, then run this on the merged tree.
set -euo pipefail
FILE=src/core2/modules/press.ts
PARTS_GLOB=(src/core2/modules/press-{base,briefs,desk-reads,exposure,ids,interviews,open,outlets,staffing,stories,week}.ts)
if [ -n "${1:-}" ]; then
  git checkout "$1" -- "$FILE"
fi
if [ "$(wc -l < "$FILE")" -lt 1000 ]; then
  echo "press.ts is already split ($(wc -l < "$FILE") lines): pass the ref that holds the unsplit file" >&2
  exit 1
fi
# A dry run first: it refuses before anything is written or deleted.
node --import tsx scripts/world/split-file.ts "$FILE" --roots scripts/world/press-roots.json --prefix press- >/dev/null
rm -f "${PARTS_GLOB[@]}"
node --import tsx scripts/world/split-file.ts "$FILE" --roots scripts/world/press-roots.json --prefix press- --write
npx prettier --write "$FILE" "${PARTS_GLOB[@]}" >/dev/null
npx eslint --fix "$FILE" "${PARTS_GLOB[@]}" >/dev/null || true
npx prettier --write "$FILE" "${PARTS_GLOB[@]}" >/dev/null
npx eslint "$FILE" "${PARTS_GLOB[@]}"
