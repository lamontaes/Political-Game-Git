"""Data-only preparation into the existing private prepared-part registry.

python3 scripts/art-asset-factory/modular_fit/prepare.py <calibration.json> <repo>
No artwork in this module. A descriptor can add another head/body/style without
editing this program. Registry publication is a separate freeze step.
"""
import base64, copy, io, json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from fit_core import visible_bounds, union_frame, Box
from intake import fit_head, fit_hair, pinned_image, digest, IntakeError, canonical
from rig import validate_profile, body_descriptor

def png(im):
    b=io.BytesIO(); im.save(b,format='PNG'); return b.getvalue()
def uri(im): return 'data:image/png;base64,'+base64.b64encode(png(im)).decode()
def emit(root, spec, identifier, kind, layer, paint, maps, ramps, coverage=None):
    folder=root/spec['outputParts']; folder.mkdir(parents=True,exist_ok=True)
    width,height=paint.size
    defs=''; regions=[]
    for channel,m in maps.items():
        defs+=f'<image id="{identifier}-{channel}-mask" data-material-map="{channel}" width="{width}" height="{height}" href="{uri(m)}"/>'
        regions.append(dict(channel=channel,maskId=f'{identifier}-{channel}-mask',neutralId='',lightId='',shadowId='',inkId='',ramps=ramps[channel]))
    svg=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><defs>{defs}</defs>'
         f'<image data-raster-paint="true" width="{width}" height="{height}" href="{uri(paint)}"/></svg>')
    path=folder/f'{identifier}.svg'; raster=folder/f'{identifier}.png'
    for p,data in [(path,svg.encode()),(raster,png(paint))]:
        if p.exists() and p.read_bytes()!=data: raise IntakeError('immutable_output_conflict',str(p))
        p.write_bytes(data)
    for channel,m in maps.items():
        p=folder/f'{identifier}-{channel}.png';data=png(m)
        if p.exists() and p.read_bytes()!=data:raise IntakeError('immutable_output_conflict',str(p))
        p.write_bytes(data)
    runtime=root/spec['outputRuntime']/f'{identifier}.svg';runtime.parent.mkdir(parents=True,exist_ok=True)
    if runtime.exists() and runtime.read_text()!=svg:raise IntakeError('immutable_output_conflict',str(runtime))
    runtime.write_text(svg)
    part=dict(id=identifier,kind=kind,layer=layer,svgPath=str(path.relative_to(root)),sha256=digest(svg.encode()),materials=regions)
    if coverage:part['coverageMaskPath']=coverage
    if kind in ('head','hair-front','hair-back'):
        b=visible_bounds(paint);part['portraitBounds']=vars(b) if b else None
    return part,str(runtime.relative_to(root))

def prepare(spec,root):
    for profile in spec.get('bodyProfiles',[]):
        validate_profile(profile,root)
    profile_bodies=[body_descriptor(p,pose) for p in spec.get('bodyProfiles',[]) for pose in p['poses']]
    registry=json.loads((root/spec['registry']).read_text())
    original=copy.deepcopy(registry)
    registry.setdefault('families',[]).extend(copy.deepcopy(spec.get('families',[])))
    registry.setdefault('garments',[]).extend(copy.deepcopy(spec.get('garments',[])))
    prior_parts={p['id']:p for ps in registry['familyAdditions'].values() for p in ps}
    templates=[json.loads((root/path).read_text()) for path in spec.get('templateRegistries',[])]
    assets={a['asset_id']:a for r in [*templates,registry] for a in r['assets']}
    for r in templates:
        for family in r.get('families',[]):
            prior_parts.update({p['id']:p for p in family.get('parts',[])})
    sources={s['id']:s for s in spec['heads']}; bodies={b['id']:b for b in [*spec['bodies'],*profile_bodies]};hairs={h['id']:h for h in spec['hairstyles']}
    report={'algorithm':'semantic-fit-v1','generation':spec['generation'],'fits':[],'hair':[],'errors':[],'newIds':[]}
    def register(rule,paint,maps,recipe):
        base=copy.deepcopy(assets[rule['previous']]);definition=base['candidate_component']
        for key in rule.get('componentOmit',[]): definition.pop(key,None)
        definition.update(rule.get('component',{}))
        if rule.get('operation','replace')=='add':definition.pop('supersedes_asset_id',None)
        else:definition['supersedes_asset_id']=rule['previous']
        part,runtime=emit(root,spec,rule['id'],definition['kind'],definition['layer'],paint,maps,spec['ramps'],rule.get('coverage'))
        part['introducedGeneration']=spec['generation']; part['fitRecipe']=recipe
        if rule.get('label'):part['label']=rule['label']
        if rule.get('anatomyOverride'):part['anatomyOverride']=rule['anatomyOverride']
        if rule.get('expressionVariants'):part['expressionVariants']=rule['expressionVariants']
        if definition['kind']=='head' and recipe.get('anatomy'):part['portraitBounds']=recipe['anatomy']
        part['logicalFamily']=definition['family']
        if rule.get('logicalIdentity') or recipe.get('logicalStyle'): part['logicalIdentity']=rule.get('logicalIdentity',recipe.get('logicalStyle'))
        for region in prior_parts.get(rule['previous'],{}).get('materials',[]):
            if region['channel'] not in maps and region['channel'] not in rule.get('removedMaterialChannels',[]):
                if any(r.get('stops') for r in region['ramps']): raise IntakeError('missing_material_map',region['channel'])
                part['materials'].append(copy.deepcopy(region))
        if rule.get('renderPieces'): definition['render_piece_ids']=rule['renderPieces']
        base.update(asset_id=rule['id'],hash=part['sha256'],final_path=runtime)
        base['calibration_lineage']=recipe
        if rule['id'] in assets: raise IntakeError('duplicate_id',rule['id'])
        registry['assets'].append(base);assets[rule['id']]=base
        registry['familyAdditions'].setdefault(rule['family'],[]).append(part)
        registry['templates'][rule['id']]={'familyId':rule['family'],'partIds':[rule['id']],'sourceSha256':part['sha256']}
        report['newIds'].append(rule['id'])
    for rule in spec['fits']:
        try:
            head=sources[rule['head']];body=bodies[rule['body']]
            paint,maps,recipe=fit_head(root,head,body)
            register(rule,paint,maps,recipe); report['fits'].append(recipe)
            for hr in rule['hair']:
                hair=hairs[hr['source']]
                hp,hm,receipt=fit_hair(root,hair,head,body,recipe)
                register(hr,hp,hm,receipt); report['hair'].append(receipt)
        except IntakeError as e:report['errors'].append({'id':rule['id'],'code':e.code,'detail':str(e)})
    for rule in spec.get('materials',[]):
        p=pinned_image(root,rule['paint'],rule['canvas'])
        maps={c:pinned_image(root,r,rule['canvas']) for c,r in rule['materialMaps'].items()}
        register(rule,p,maps,{'source':rule['paint'],'materialMaps':rule['materialMaps'],'algorithm':'raster-material-v1'})
    for rule in spec.get('auxiliaryParts',[]):
        p=pinned_image(root,rule['paint'],rule['canvas'])
        maps={c:pinned_image(root,r,rule['canvas']) for c,r in rule['materialMaps'].items()}
        part,_=emit(root,spec,rule['id'],rule['kind'],rule['layer'],p,maps,spec['ramps'])
        part['introducedGeneration']=spec['generation']
        registry['familyAdditions'].setdefault(rule['family'],[]).append(part)
        registry['templates'][rule['id']]={'familyId':rule['family'],'partIds':[rule['id']],'sourceSha256':part['sha256']}
    out=root/spec['report'];out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
    if report['errors']:raise IntakeError('batch_refused',f"{len(report['errors'])} fit errors; registry unchanged, see {out}")
    # No existing asset, template, part or generation may change on append.
    assert registry['assets'][:len(original['assets'])]==original['assets']
    assert registry['generations']==original['generations']
    (root/spec['registryCandidate']).write_text(json.dumps(registry,indent=2)+'\n')
    return report

if __name__=='__main__':
    root=Path(sys.argv[2]).resolve();spec=json.loads(Path(sys.argv[1]).read_text())
    r=prepare(spec,root);print(json.dumps({'fits':len(r['fits']),'hair':len(r['hair']),'parts':len(r['newIds']),'errors':r['errors']}))
