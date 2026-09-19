"""Offline profile contract for baked modular people; no runtime anatomy rules.

Coordinates are authored image-space measurements, never physical dimensions.
Each supported pose supplies its own painted source and attachment landmarks.
"""
import math
from intake import IntakeError, canonical, digest, pinned_image

JOINTS = ('root', 'feet', 'pelvis', 'torso', 'shoulderLeft', 'shoulderRight',
          'elbowLeft', 'elbowRight', 'wristLeft', 'wristRight', 'handLeft',
          'handRight', 'neckBase', 'jaw', 'head', 'hair', 'seat')
JOINTS_V2 = JOINTS + ('scalp', 'kneeLeft', 'kneeRight', 'ankleLeft', 'ankleRight')
VIEWS_V2 = ('front', 'three-quarter-left', 'three-quarter-right', 'left-profile', 'right-profile', 'rear-three-quarter-left', 'rear-three-quarter-right', 'back')
OWNERS = {'body': ('neck', 'chest', 'arms', 'hands'),
          'head': ('face', 'ears', 'jaw'), 'garment': ('collar', 'sleeves'),
          'hair-front': ('frontHair',), 'hair-back': ('rearHair',)}

def validate_profile(profile, root=None):
    version2 = profile.get('schema') == 'modular-body-profile-v2'
    if profile.get('schema') not in ('modular-body-profile-v1', 'modular-body-profile-v2'):
        raise IntakeError('unsupported_profile', str(profile.get('schema')))
    if profile.get('confidence') not in ('exact', 'specified', 'visual-estimate'):
        raise IntakeError('missing_confidence', profile['id'])
    canvas = profile['canvas']
    if canvas != [600, 1200]:
        raise IntakeError('canvas_mismatch', 'this profile version uses 600x1200')
    if profile.get('ownership') != {k:list(v) for k,v in OWNERS.items()}:
        raise IntakeError('ambiguous_ownership', profile['id'])
    poses = profile.get('poses', {})
    if not poses:
        raise IntakeError('unsupported_pose', 'no authored pose')
    for name, pose in poses.items():
        views = VIEWS_V2 if version2 else ('front','three-quarter-left','three-quarter-right','left-profile','right-profile')
        if pose.get('supportedHeadViews') is not None and (not pose['supportedHeadViews'] or any(v not in views for v in pose['supportedHeadViews'])):
            raise IntakeError('incompatible_view', name)
        if pose.get('view') not in (VIEWS_V2 if version2 else ('front',)):
            raise IntakeError('incompatible_view', name)
        if set(pose.get('landmarks', {})) != set(JOINTS_V2 if version2 else JOINTS):
            raise IntakeError('missing_geometry', name)
        for joint, point in pose['landmarks'].items():
            if len(point)!=2 or any(not isinstance(n,(int,float)) or not math.isfinite(n) for n in point):
                raise IntakeError('missing_geometry', joint)
            if not (0<=point[0]<=canvas[0] and 0<=point[1]<=canvas[1]):
                raise IntakeError('geometry_outside_canvas', joint)
        if version2:
            # A view is authored data, never a rotation of a frontal raster.
            if not pose.get('source') or not pose.get('sourceCanvas'):
                raise IntakeError('missing_source', name)
            if not pose.get('compatibleSourcePoses') or not all(isinstance(v, str) and v for v in pose['compatibleSourcePoses']):
                raise IntakeError('unsupported_pose', name)
            contacts = pose.get('contacts', {})
            if not all(k in contacts for k in ('feet', 'leftFoot', 'rightFoot', 'seat', 'hands')):
                raise IntakeError('missing_contacts', name)
            hands = contacts['hands']
            if not isinstance(hands, dict) or set(hands) != {'left', 'right'}:
                raise IntakeError('missing_contacts', 'hands require separate left/right points or null')
            points = {k: contacts[k] for k in ('feet', 'leftFoot', 'rightFoot', 'seat')}
            points.update(leftHand=hands['left'], rightHand=hands['right'])
            for key, point in points.items():
                if point is None and key in ('seat', 'leftHand', 'rightHand'):
                    continue
                if not isinstance(point, list) or len(point) != 2 or any(isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in point):
                    raise IntakeError('missing_contacts', key)
                if not (0 <= point[0] <= canvas[0] and 0 <= point[1] <= canvas[1]):
                    raise IntakeError('geometry_outside_canvas', key)
        transform=pose['sourceTransform']
        if not 0 < transform['scale'] <= 1:
            raise IntakeError('native_detail_shortfall', name)
        if not all(math.isfinite(transform[k]) for k in ('scale','dx','dy')):
            raise IntakeError('missing_geometry', name)
        if root is not None:
            pinned_image(root,pose['source'],pose['sourceCanvas'])
    return digest(canonical(profile))

def body_descriptor(profile, pose_name):
    """Map an admitted profile to the existing uniform fitter without ID cases."""
    fingerprint=validate_profile(profile)
    if pose_name not in profile['poses']:
        raise IntakeError('unsupported_pose', pose_name)
    pose=profile['poses'][pose_name]
    return {'schemaVersion':1,'id':profile['id']+'/'+pose_name,
            'canvas':profile['canvas'],'view':pose['view'],
            'supportedHeadViews':pose.get('supportedHeadViews',[pose['view']]),
            'compatibleSourcePoses':pose.get('compatibleSourcePoses',['standing-neutral']),
            'neckOwnership':'body-layer','profileHash':fingerprint,
            'calibration':{'status':'calibrated','version':profile['revision'],
                           'confidence':profile['confidence'],
                           'provenance':profile['provenance']},
            'socket':{**profile['headSize'],'attachment':pose['landmarks']['jaw']}}
