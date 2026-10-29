import json,sys,numpy as np
from PIL import Image,ImageDraw
S="/tmp/claude-0/-home-user-Political-Game-Git/9b9a7143-fadd-57da-8265-08ee31deef47/scratchpad"
R="/home/user/Political-Game-Git"
place=sys.argv[1]; margin=float(sys.argv[2]); tag=sys.argv[3]
bg=Image.open(f"{R}/art/backdrops/{place}__midday.jpg").convert("RGBA"); W,H=bg.size
dep=np.load(f"{S}/depth/{'senate' if 'senate' in place else 'council'}.npy").astype(np.float32)
dep=(dep-dep.min())/(dep.max()-dep.min()); 
from PIL import Image as I
dep=np.array(I.fromarray(dep).resize((W,H),I.BILINEAR))
figs=json.load(open(S+"/fig/figs.json"))
stag=json.load(open(S+"/stag.json"))[place]
def fig(sex,build,outfit,pose,angle):
    l=[r for r in figs if r['sex']==sex and r['build']==build and r['outfit']==outfit and r['pose']==pose and r['angle']==angle]
    if not l: l=[r for r in figs if r['sex']==sex and r['build']==build and r['pose']==pose and r['angle']==angle]
    return l[0]
picks=json.load(open(S+"/comp/picks_%s.json"%(place+(sys.argv[4] if len(sys.argv)>4 else ""))))
def pp(y,band='adult'):
    return min(1.72*stag['metersPercent']*(y-stag['horizonY']),y-2)
def render(mode):
    out=bg.copy()
    for pk in picks:
        if 'spot' in pk: spot=[s for s in stag['spots'] if s['id'].endswith(':spot:%d'%pk['spot'])][0]
        else: spot={'x':pk['x'],'y':pk['row'],'seatY':{80:68.3,74:64.1,68:59.8,62:55.6,56:51.3}[pk['row']],'clipBelowY':{80:71,74:65,68:59,62:53,56:47}[pk['row']]}
        seated=fig(pk['sex'],pk['build'],pk['outfit'],'sit',pk['angle'])
        stand=fig(pk['sex'],pk['build'],pk['outfit'],'stand','three-quarter')
        scale=(pp(spot['y'])/100*H)/stand['footY']
        im=Image.open(f"{S}/fig/{seated['file']}").convert("RGBA")
        w,h=int(im.width*scale),int(im.height*scale); im=im.resize((w,h),Image.LANCZOS)
        if pk.get('flip'): im=im.transpose(Image.FLIP_LEFT_RIGHT)
        seatY=(spot.get('seatY') or spot['y'])/100*H
        hip=(seated.get('seatY') or seated['height']*0.6)*scale
        left=int(spot['x']/100*W-w/2); top=int(seatY-hip)
        a=np.array(im)
        if mode=='crop' and spot.get('clipBelowY') is not None:
            cut=int(spot['clipBelowY']/100*H)-top
            if cut<h: a[max(cut,0):,:,3]=0
        if mode=='depth':
            # figure depth: the chair back at the seat point, pushed farther by the margin
            cx,cy=int(spot['x']/100*W),int(seatY)
            win=dep[max(cy-12,0):cy+12,max(cx-12,0):cx+12]
            fd=float(np.median(win))-margin
            ys0,xs0=max(top,0),max(left,0); ys1,xs1=min(top+h,H),min(left+w,W)
            sc=dep[ys0:ys1,xs0:xs1]
            vis=np.clip((fd-sc)/0.012+1.0,0,1)  # soft edge: drawn where scene is farther than the figure
            sub=a[ys0-top:ys1-top,xs0-left:xs1-left,3].astype(np.float32)*vis
            a[ys0-top:ys1-top,xs0-left:xs1-left,3]=sub.astype(np.uint8)
            # outside the picture nothing to test
        im2=Image.fromarray(a)
        out.alpha_composite(im2,(left,top)) if left>=0 and top>=0 else out.alpha_composite(im2.crop((max(-left,0),max(-top,0),w,h)),(max(left,0),max(top,0)))
    return out.convert("RGB")
a=render('paste'); b=render('crop'); c=render('depth')
def lab(im,t):
    d=ImageDraw.Draw(im); d.rectangle([0,0,430,34],fill=(0,0,0)); d.text((8,8),t,fill=(255,255,255)); return im
D=f"{R}/docs/coordination/playtest/people-research"
lab(a,"plain paste (no occlusion)").save(f"{S}/comp/{place}_paste.png")
lab(b,"today: straight crop line").save(f"{S}/comp/{place}_crop.png")
lab(c,f"depth-tested (margin {margin})").save(f"{S}/comp/{place}_depth_{tag}.png")
print('ok')
