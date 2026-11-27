#!/usr/bin/env bash
# Re-runs the press.ts split on the tree as it stands (World item 4).
# Usage: scripts/world/press-split.sh   (from the repository root)
set -euo pipefail
FILE=src/core2/modules/press.ts
git checkout -- "$FILE"
rm -f src/core2/modules/press-{base,briefs,desk-reads,exposure,interviews,open,outlets,staffing,stories,week}.ts
node --import tsx scripts/world/split-file.ts "$FILE" --roots scripts/world/press-roots.json --prefix press- --write
PARTS=$(ls src/core2/modules/press-{base,briefs,desk-reads,exposure,interviews,open,outlets,staffing,stories,week}.ts)
npx prettier --write "$FILE" $PARTS >/dev/null
npx eslint --fix "$FILE" $PARTS >/dev/null || true
npx prettier --write "$FILE" $PARTS >/dev/null
npx eslint "$FILE" $PARTS
