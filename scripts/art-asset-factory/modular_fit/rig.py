"""Offline profile contract for baked modular people; no runtime anatomy rules.

Coordinates are authored image-space measurements, never physical dimensions.
Each supported pose supplies its own painted source and attachment landmarks.
"""
import math
from intake import IntakeError, canonical, digest, pinned_image

JOINTS = ('root', 'feet', 'pelvis', 'torso', 'shoulderLeft', 'shoulderRight',
          'elbowLeft', 'elbowRight', 'wristLeft', 'wristRight', 'handLeft',
          'handRight', 'neckBase', 'jaw', 'head', 'hair', 'seat')
OWNERS = {'body': ('neck', 'chest', 'arms', 'hands'),
          'head': ('face', 'ears', 'jaw'), 'garment': ('collar', 'sleeves'),
          'hair-front': ('frontHair',), 'hair-back': ('rearHair',)}

def validate_profile(profile, root=None):
    if profile.get('schema') != 'modular-body-profile-v1':
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
        if pose.get('supportedHeadViews') is not None and (not pose['supportedHeadViews'] or any(v not in ('front','three-quarter-left','three-quarter-right','left-profile','right-profile') for v in pose['supportedHeadViews'])):
            raise IntakeError('incompatible_view', name)
        if pose.get('view') != 'front':
            raise IntakeError('incompatible_view', name)
        if set(pose.get('landmarks', {})) != set(JOINTS):
            raise IntakeError('missing_geometry', name)
        for joint, point in pose['landmarks'].items():
            if len(point)!=2 or any(not isinstance(n,(int,float)) or not math.isfinite(n) for n in point):
                raise IntakeError('missing_geometry', joint)
            if not (0<=point[0]<=canvas[0] and 0<=point[1]<=canvas[1]):
                raise IntakeError('geometry_outside_canvas', joint)
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
            'compatibleSourcePoses':['standing-neutral'],
            'neckOwnership':'body-layer','profileHash':fingerprint,
            'calibration':{'status':'calibrated','version':profile['revision'],
                           'confidence':profile['confidence'],
                           'provenance':profile['provenance']},
            'socket':{**profile['headSize'],'attachment':pose['landmarks']['jaw']}}
