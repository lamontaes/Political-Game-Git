"""Deterministic source separation driven by authored masks and calibration.

Original generated masters remain immutable. Cleanup is explicit source data;
material shades are independent of coverage and preserve excluded feature RGB.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from fit_core import Fit, warp_group
from intake import IntakeError, pinned_image, canonical, digest

def polygon_mask(canvas, polygons):
    mask=Image.new('L',tuple(canvas))
    draw=ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([tuple(p) for p in polygon],fill=255)
    return mask

def separate(root, descriptor):
    paint=pinned_image(root,descriptor['source'],descriptor['canvas'])
    a=np.array(paint).copy()
    cutoff=descriptor.get('alphaCleanupThreshold',0)
    if not isinstance(cutoff,int) or not 0<=cutoff<=32:
        raise IntakeError('invalid_alpha_cleanup','threshold must be 0..32')
    a[a[...,3]<=cutoff]=0
    owner=np.array(pinned_image(root,descriptor['ownershipMask'],descriptor['canvas']).getchannel('R')) if descriptor.get('ownershipMask') else np.array(polygon_mask(descriptor['canvas'],descriptor['ownershipPolygons']))
    a[...,3]=np.rint(a[...,3].astype(float)*owner/255).astype('uint8')
    maps={}
    for channel, material in descriptor.get('materials',{}).items():
        region=(np.array(pinned_image(root,material['mask'],descriptor['canvas']).getchannel('R'))>0) if material.get('mask') else (np.array(polygon_mask(descriptor['canvas'],material['polygons']))>0)
        excluded=np.array(polygon_mask(descriptor['canvas'],material.get('protectedPolygons',[])))>0
        rgb=a[...,:3].astype(float)
        # Optional calibrated color bounds refine an authored semantic region;
        # they never discover skin from arbitrary clothing or the whole image.
        if 'rgbBounds' in material:
            lo,hi=material['rgbBounds']
            region &= ((rgb>=lo)&(rgb<=hi)).all(-1)
        if 'minimumRedBlueDifference' in material:
            region &= rgb[...,0]-rgb[...,2]>=material['minimumRedBlueDifference']
        lum=rgb @ np.array([.2126,.7152,.0722])
        shadow,neutral,light=material['shadeLuminance']
        if not 0<=shadow<neutral<light<=255:
            raise IntakeError('invalid_material','ordered luminance calibration required')
        shade=np.interp(lum,[shadow,neutral,light],[0,128,255]).round().astype('uint8')
        weight=(region & ~excluded & (a[...,3]>0) & (lum>material.get('preserveInkBelow',24))).astype('uint8')*255
        maps[channel]=Image.fromarray(np.dstack([shade,shade,shade,weight]))
    transform=Fit(**descriptor['transform'])
    if not 0<transform.scale<=1:raise IntakeError('native_detail_shortfall','source separation cannot enlarge')
    results=warp_group([Image.fromarray(a),*maps.values()],transform,tuple(descriptor['outputCanvas']))
    return results[0],dict(zip(maps,results[1:]))

def prepare_sources(root, specification):
    """Executable source admission; hashes and explicit masks are the interface."""
    from prepare import png
    root=Path(root).resolve()
    receipts=[]
    for item in specification['parts']:
        paint,maps=separate(root,item)
        outputs={item['output']:paint,**{item['materialOutputs'][k]:v for k,v in maps.items()}}
        hashes={}
        for name,im in outputs.items():
            path=(root/name).resolve()
            if not path.is_relative_to(root):raise IntakeError('invalid_path',name)
            data=png(im)
            if path.exists() and path.read_bytes()!=data:
                raise IntakeError('immutable_output_conflict',name)
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():path.write_bytes(data)
            hashes[name]=digest(data)
        receipts.append({'source':item['source'],'recipeHash':digest(canonical(item)),
                         'outputs':hashes,'acceptance':'candidate-unapproved'})
    return receipts

if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit('usage: source_parts.py specification.json repo receipt.json')
    spec=json.loads(Path(sys.argv[1]).read_text())
    receipts=prepare_sources(sys.argv[2],spec)
    Path(sys.argv[3]).write_text(json.dumps(receipts,indent=2)+'\n')
    print(f'Prepared {len(receipts)} source parts; originals unchanged')
