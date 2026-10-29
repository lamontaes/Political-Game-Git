"""Left/right facing score for library sheets: pass when each pair's flipped right figure is closer to the left one."""
import sys, numpy as np
from PIL import ImageOps
import template as T

def d(a, b):
    b = b.resize(a.size); A = np.asarray(a.convert('LA')).astype(float); B = np.asarray(b.convert('LA')).astype(float)
    return round(float(np.abs(A - B).mean()), 1)

for p in sys.argv[1:]:
    c = T.library(p); out = []
    ok = all(k in c for k in T.STRIP)
    for a, b in [('tq-left', 'tq-right'), ('btq-left', 'btq-right')]:
        if a in c and b in c:
            s, m = d(c[a], c[b]), d(c[a], ImageOps.mirror(c[b])); ok &= m < s; out.append(f'{a[:-5]} same {s} flip {m}')
    print(p, 'PASS' if ok else 'FAIL', '; '.join(out))
