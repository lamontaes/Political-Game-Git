import os, sys
os.environ.setdefault("STRICT","1")
P, V, M = sys.argv[1], sys.argv[2], sys.argv[3]
sys.argv=["x"]
import numpy as np
from PIL import Image
from scipy import ndimage
import build_seats as B
from align import align
W,H=B.W,B.H
O=np.array(Image.open(f'backdrops/{P}__midday.jpg').convert('RGB').resize((W,H)))
Vi=np.array(Image.open(V).convert('RGB').resize((W,H),Image.LANCZOS))
Mk=np.array(Image.open(M).convert('L').resize((W,H),Image.LANCZOS))>110
warped,_,(gy,gx)=align(O,Vi,ndimage.binary_dilation(Mk,iterations=6))
yy,xx=np.mgrid[0:H,0:W]
Mw=ndimage.map_coordinates(Mk.astype(float),[yy+gy,xx+gx],order=1)>0.5
diff=np.abs(warped.astype(int)-O.astype(int)).max(axis=2)>22
Pm=ndimage.binary_fill_holes(ndimage.binary_opening(Mw&ndimage.binary_dilation(diff,iterations=3),iterations=1))
lab,k=ndimage.label(Pm)
dd=np.abs(warped.astype(int)-O.astype(int)).max(axis=2)>40
print("mask px", Mk.sum(), "after diff", Pm.sum())
for c in range(1,k+1):
    m=lab==c
    if m.sum()<400: continue
    ys,xs=np.nonzero(m); h=ys.max()-ys.min()+1; w=xs.max()-xs.min()+1
    os.environ["STRICT"]="0"; B.STRICT=False
    nheads=len(B.split_people(m)); B.STRICT=True
    box=np.zeros((H,W),bool); box[ys.min():min(H,ys.max()+int(h*0.35)),max(0,xs.min()-h//6):min(W,xs.max()+h//6)]=True
    around=box&~ndimage.binary_dilation(Pm,iterations=3)
    furn=dd[around].mean() if around.sum()>50 else 0
    why=[]; ok=B.person_ok(m, lambda y: 0, why); ok=why[0]; ob=B.one_body(m,h)
    print(f"x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} h{h} w{w} heads={nheads} furn={furn:.2f} ok={ok} onebody={ob} hi={B.heads_in(m)}")
# contact sheet of every component with its verdict
from PIL import ImageDraw
cells=[]
for c in range(1,k+1):
    m=lab==c
    if m.sum()<400: continue
    ys,xs=np.nonzero(m); h=ys.max()-ys.min()+1
    why=[]; B.person_ok(m, lambda y: 0, why)
    crop=np.dstack([warped, (m*255).astype(np.uint8)])[ys.min():ys.max()+1, xs.min():xs.max()+1]
    im=Image.fromarray(crop); im.thumbnail((140,180))
    bg=Image.new('RGBA',im.size,(170,175,185,255)); bg.alpha_composite(im); cells.append((bg.convert('RGB'),why[0]))
cols=8; sheet=Image.new('RGB',(150*cols,200*((len(cells)+cols-1)//cols)),(40,40,48)); d=ImageDraw.Draw(sheet)
for i,(im,w) in enumerate(cells):
    x,y=(i%cols)*150,(i//cols)*200; sheet.paste(im,(x+4,y+16)); d.text((x+4,y+2),w,fill=(0,255,0) if w=='ok' else (255,90,90))
sheet.save(os.environ.get('SHEET','/tmp/claude-501/diag.jpg'))
