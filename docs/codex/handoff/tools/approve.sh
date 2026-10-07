#!/bin/zsh
# Owner, Oct 2 3:58 p.m.: I review each READY PR as it comes in and hand it to the Merge session.
# Same guards as merge.sh (base main, reviewed head, design check), then the approval comment only; Merge merges.
R=lamontaes/Political-Game-Git; PR=$1; TESTED=$2; TEXT=$3
read BASE HEAD <<< $(gh pr view $PR --repo $R --json baseRefName,headRefOid --jq '"\(.baseRefName) \(.headRefOid)"')
[ "$BASE" != "main" ] && { echo "REFUSED: #$PR targets $BASE, not main"; exit 1; }
[[ "$HEAD" != ${TESTED}* ]] && { echo "REFUSED: #$PR head is ${HEAD:0:9}, reviewed ${TESTED}"; exit 1; }
python3 "${0:A:h}/design_check.py" $PR "$TEXT" || { echo "REFUSED: #$PR failed the design check (see above)"; exit 1; }
gh pr comment $PR --repo $R --body "CLAUDE CTO APPROVED FOR MERGE at $HEAD — $TEXT
MERGE SESSION: run the changed tests on this head merged onto current main and merge." >/dev/null && echo "APPROVED #$PR at ${HEAD:0:9} (sent to Merge)"
