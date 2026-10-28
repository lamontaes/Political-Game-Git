#!/bin/bash
# cut every natural pose whose marker map is downloaded
cd "$(dirname "$0")"
for k in "$@"; do
  [ -f art/dl/wm-nat-$k.png ] || { echo "nat-$k: no marker yet"; continue; }
  base=""; for c in art/nb/nb2-$k.png art/nb/nb3-$k.png art/nb/nb4-$k.png art/nb/nb6-$k.png; do [ -f $c ] && { base=$c; break; }; done
  [ "$k" = "s1-old" ] && base=art/nb/nb5-old-s1.png
  rm -rf art/wardrobe/nat-$k
  python3 wardrobe_parts.py $base art/dl/wm-nat-$k.png nat-$k art/dl art/wardrobe/nat-$k $base art/dl/hk-nat-$k 2>&1 | grep -E '^(thin|nat-)'
done
