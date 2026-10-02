#!/bin/zsh
# Adds a missing 'section:' line to a PR's release notes (small fix; never sent back). Prints the new head.
# Usage: fix_note.sh <pr> [Fixed|Changed|Added|Improved]
R=lamontaes/Political-Game-Git; PR=$1; SEC=${2:-Changed}
BR=$(gh pr view $PR -R $R --json headRefName -q .headRefName)
W=/tmp/wt-note-$PR; rm -rf $W
git -C /tmp/wt-play fetch -q origin $BR && git -C /tmp/wt-play worktree add -q $W FETCH_HEAD || exit 1
cd $W; changed=0
for f in $(git diff --name-only origin/main...HEAD -- docs/release/changes/); do
  [ -f $f ] || continue
  top=$(awk 'NR>1&&$0=="---"{exit} {print}' $f)
  if echo "$top" | grep -q '^impact: none'; then
    echo "$top" | grep -q '^section:' && { sed -i '' '/^section:/d' $f; changed=1; }   # impact:none must not carry a section
  else
    echo "$top" | grep -q '^section:' || { sed -i '' "s/^impact: \(.*\)$/impact: \1\nsection: $SEC/" $f; changed=1; }
  fi
done
if [ $changed = 1 ]; then
  git commit -qam "Add release-note section header

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q origin HEAD:$BR
  NEW=$(git rev-parse HEAD)
  until [ "$(gh pr view $PR -R $R --json headRefOid -q .headRefOid)" = "$NEW" ]; do sleep 3; done
fi
git rev-parse --short=9 HEAD; cd /; git -C /tmp/wt-play worktree remove --force $W
