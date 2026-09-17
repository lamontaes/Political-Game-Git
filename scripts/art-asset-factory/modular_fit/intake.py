"""Calibrated source/head-body intake. No asset IDs or body-weight rules.

Produces immutable recipes and prepared raster layers for the existing renderer.
The caller owns registry admission and generation freezing, never this solver.
"""
from pathlib import Path
import hashlib, json, math
import numpy as np
from PIL import Image
from fit_core import Box, HeadGeometry, BodySocket, Fit, solve_fit, visible_bounds, warp_group, warp_material_group

VERSION = 'semantic-fit-v1'

class IntakeError(ValueError):
    def __init__(self, code, detail):
        self.code = code
        super().__init__(f'{code}: {detail}')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()

def pinned_image(root, ref, canvas):
    p = (Path(root) / ref['path']).resolve()
    if not p.is_relative_to(Path(root).resolve()):
        raise IntakeError('invalid_path', ref['path'])
    if not p.is_file(): raise IntakeError('missing_pixels', ref['path'])
    if digest(p.read_bytes()) != ref['sha256']:
        raise IntakeError('source_hash_mismatch', ref['path'])
    im = Image.open(p).convert('RGBA')
    if list(im.size) != canvas: raise IntakeError('canvas_mismatch', ref['path'])
    return im

def geometry(d):
    try:
        if d['schemaVersion'] != 1 or not d['calibration']['version'] or not d['calibration']['provenance']:
            raise ValueError('calibration version/provenance required')
        if d['calibration']['status'] != 'calibrated':
            raise IntakeError('ambiguous_segmentation', d['id'])
        g=d['geometry']
        b=Box(*g['anatomy']); b.validate()
        eye=g['eyeLine']; crown=g['crown']; chin=g['chin']
        if not b.top <= crown[1] < eye < chin[1] <= b.bottom:
            raise ValueError('crown/eye/chin order')
        if not 0 <= b.left < b.right <= d['canvas'][0] or not 0 <= b.top < b.bottom <= d['canvas'][1]:
            raise ValueError('anatomy outside source canvas')
        return HeadGeometry(b,tuple(g['attachment']),d['view'],d['calibration']['version'])
    except IntakeError: raise
    except (KeyError, TypeError, ValueError) as e:
        raise IntakeError('missing_geometry', str(e)) from e

def fit_recipe(head, body):
    g=geometry(head)
    try:
        if body['schemaVersion'] != 1 or not body['calibration']['version'] or not body['calibration']['provenance']:
            raise ValueError('body calibration required')
        if body['calibration']['status'] != 'calibrated':
            raise IntakeError('ambiguous_segmentation', body['id'])
        if head['pose'] not in body['compatibleSourcePoses']:
            raise IntakeError('unsupported_pose', head['pose'])
        s=body['socket']
        target_view=body['view']
        if body.get('neckOwnership')=='body-layer':
            if head['view'] not in body.get('supportedHeadViews',[body['view']]):
                raise IntakeError('incompatible_view','body socket has no authored support for this head view')
            target_view=head['view']
        target=BodySocket(tuple(s['attachment']),tuple(s['heightRange']),tuple(s['widthRange']),s['preferredHeight'],target_view,body['calibration']['version'])
        result=solve_fit(g,target)
    except IntakeError: raise
    except (KeyError,TypeError,ValueError) as e:
        raise IntakeError('missing_geometry',str(e)) from e
    if result.transform is None: raise IntakeError(result.status,result.reason)
    f=result.transform
    # This offline path writes final rasters: never upscale its source pixels.
    if f.scale > 1: raise IntakeError('native_detail_shortfall','output would enlarge source raster')
    algorithm='semantic-fit-v2' if body.get('neckOwnership')=='body-layer' else VERSION
    payload={'algorithm':algorithm,'head':head,'body':body}
    return {'algorithm':algorithm,'cacheKey':digest(canonical(payload)),
            'sourceHash':head['paint']['sha256'],'head':head['id'],'body':body['id'],
            'sourceView':head['view'],'bodyView':body['view'],
            'transform':{'scale':f.scale,'dx':f.dx,'dy':f.dy},
            'anatomy':vars(f.box(g.anatomy)),'attachment':f.point(g.attachment),
            'calibrationConfidence':head['calibration']['confidence'],
            'acceptance':'candidate-unapproved'}

def fit_head(root, head, body):
    recipe=fit_recipe(head,body); f=Fit(**recipe['transform'])
    paint=pinned_image(root,head['paint'],head['canvas'])
    if head.get('protectedFeatures'):
        pinned_image(root,head['protectedFeatures'],head['canvas'])
    semantic=pinned_image(root,head['anatomyMask'],head['canvas']).getchannel('R')
    bounds=visible_bounds(paint,semantic_mask=semantic)
    if bounds is None: raise IntakeError('ambiguous_segmentation','empty semantic head support')
    declared=geometry(head).anatomy
    if any(abs(a-b)>2 for a,b in zip(vars(bounds).values(),vars(declared).values())):
        raise IntakeError('calibration_drift','semantic support disagrees with calibrated anatomy')
    mask=pinned_image(root,head['ownershipMask'],head['canvas']).getchannel('R')
    a=np.array(paint); a[...,3]=(a[...,3].astype(float)*np.array(mask)/255).round().astype('uint8')
    layers=[Image.fromarray(a)]
    for ref in head.get('materialMaps',{}).values(): layers.append(pinned_image(root,ref,head['canvas']))
    result=(warp_material_group(layers[0],layers[1:],f,tuple(body['canvas']))
            if head.get('materialSampling')=='coverage-normalized-v1'
            else warp_group(layers,f,tuple(body['canvas'])))
    if body.get('neckOwnership')=='body-layer':
        # Clean admitted heads end at the anatomical jaw. Their associated body
        # already owns the continuous neck; never append a second neck donor.
        recipe['paintSupport']=vars(visible_bounds(paint))
        recipe['semanticSupport']=vars(bounds)
        recipe['neckOwnership']='body-layer'
        return result[0],dict(zip(head.get('materialMaps',{}),result[1:])),recipe
    # Body-owned neck patch is in BODY coordinates and never scales with the face.
    neck=pinned_image(root,body['neckPaint'],body['canvas'])
    face=result[0]; result[0]=Image.alpha_composite(neck,face)
    recipe['paintSupport']=vars(visible_bounds(paint))
    recipe['semanticSupport']=vars(bounds)
    recipe['transparentPadding']=[recipe['paintSupport']['left'],recipe['paintSupport']['top'],head['canvas'][0]-recipe['paintSupport']['right'],head['canvas'][1]-recipe['paintSupport']['bottom']]
    # Material maps store a shade in RGB and independent weight in alpha. Use the
    # visible paint's ownership to keep face/neck shade references separate.
    maps={}
    for channel,mapped in zip(head.get('materialMaps',{}),result[1:]):
        nm=pinned_image(root,body['neckMaterials'][channel],body['canvas']) if channel in body.get('neckMaterials',{}) else Image.new('RGBA',neck.size)
        n=np.array(nm); m=np.array(mapped); fa=np.array(face)[...,3:4]/255
        rgb=m[...,:3]*fa+n[...,:3]*(1-fa)
        weight=np.maximum(m[...,3:4]*fa,n[...,3:4]*(1-fa))
        maps[channel]=Image.fromarray(np.concatenate([rgb,weight],axis=2).round().astype('uint8'))
    return result[0],maps,recipe

def fit_hair(root, hair, head, body, recipe):
    if hair['view']!=head['view'] or hair['pose']!=head['pose']:
        raise IntakeError('incompatible_view','hair cannot synthesize another view/pose')
    hs=hair['scalp']; ts=head['geometry']['scalp']
    k=ts['width']/hs['width']
    # Hair fits to a canonical scalp before it shares the head-to-body transform.
    f=Fit(**recipe['transform']); scale=k*f.scale
    if scale>1: raise IntakeError('native_detail_shortfall','hair fit enlarges source')
    t=Fit(scale,f.scale*(ts['centerX']-k*hs['centerX'])+f.dx,f.scale*(ts['top']-k*hs['top'])+f.dy)
    p=pinned_image(root,hair['paint'],hair['canvas'])
    maps={ch:pinned_image(root,ref,hair['canvas']) for ch,ref in hair['materialMaps'].items()}
    imgs=(warp_material_group(p,list(maps.values()),t,tuple(body['canvas']))
          if hair.get('materialSampling')=='coverage-normalized-v1'
          else warp_group([p,*maps.values()],t,tuple(body['canvas'])))
    return imgs[0],dict(zip(maps,imgs[1:])),{'transform':vars(t),'logicalStyle':hair['logicalStyle'],
        'cacheKey':digest(canonical([recipe['cacheKey'],hair,VERSION]))}
