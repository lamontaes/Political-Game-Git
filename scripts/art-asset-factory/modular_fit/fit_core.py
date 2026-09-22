"""Candidate offline fitting primitives, not a replacement renderer or approved art.

Semantic anatomy masks/landmarks must come from calibrated asset metadata.
Alpha-only bounds measure visible paint, not anatomy. No asset-name special cases.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
from typing import Iterable
import numpy as np
from PIL import Image


@dataclass(frozen=True)
class Box:
    left: float
    top: float
    right: float
    bottom: float

    @property
    def width(self) -> float:
        return self.right - self.left

    @property
    def height(self) -> float:
        return self.bottom - self.top

    def validate(self) -> None:
        if not all(math.isfinite(v) for v in (self.left,self.top,self.right,self.bottom)) or self.width <= 0 or self.height <= 0:
            raise ValueError('Invalid nonempty box')


@dataclass(frozen=True)
class HeadGeometry:
    anatomy: Box
    # Source-space registration point; NOT inferred from bottommost alpha pixel.
    attachment: tuple[float,float]
    view: str
    # Evidence/calibration identity: nonempty and pinned with the asset record.
    calibration_id: str


@dataclass(frozen=True)
class BodySocket:
    attachment: tuple[float,float]
    height_range: tuple[float,float]
    width_range: tuple[float,float]
    preferred_height: float
    view: str
    calibration_id: str


@dataclass(frozen=True)
class Fit:
    scale: float
    dx: float
    dy: float

    def point(self, p: tuple[float,float]) -> tuple[float,float]:
        return self.scale*p[0]+self.dx, self.scale*p[1]+self.dy

    def box(self, b: Box) -> Box:
        x0,y0=self.point((b.left,b.top));x1,y1=self.point((b.right,b.bottom))
        return Box(x0,y0,x1,y1)

    def inverse_affine(self) -> tuple[float,float,float,float,float,float]:
        if not math.isfinite(self.scale) or self.scale <= 0:
            raise ValueError('Invalid scale')
        return 1/self.scale,0,-self.dx/self.scale,0,1/self.scale,-self.dy/self.scale


@dataclass(frozen=True)
class FitResult:
    status: str  # fitted / needs_calibration / incompatible_view / needs_source_review
    transform: Fit | None
    reason: str


def visible_bounds(image: Image.Image, threshold: int = 8,
                   semantic_mask: Image.Image | None = None) -> Box | None:
    """Automatically measure support, optionally restricted to a semantic mask.

    Threshold is a diagnostic parameter, not a universal definition of opaque.
    Missing semantic_mask returns PAINT bounds; do not call those skull bounds.
    """
    if not 1 <= threshold <= 255:
        raise ValueError('threshold must be in 1..255')
    a=np.asarray(image.convert('RGBA').getchannel('A'))
    support=a >= threshold
    if semantic_mask is not None:
        if semantic_mask.size != image.size:
            raise ValueError('mask and image dimensions differ')
        support &= np.asarray(semantic_mask.convert('L')) > 0
    yy,xx=np.where(support)
    if len(xx)==0:
        return None
    return Box(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))


def _finite_point(point: tuple[float,float]) -> None:
    if len(point)!=2 or not all(math.isfinite(v) for v in point):
        raise ValueError('Invalid attachment')


def _range(value: tuple[float,float]) -> None:
    if len(value)!=2 or not all(math.isfinite(v) for v in value) or value[0]<=0 or value[1]<value[0]:
        raise ValueError('Invalid target range')


def solve_fit(source: HeadGeometry, target: BodySocket) -> FitResult:
    """Preserve source aspect ratio; use intersection of declared width/height bands.

    Never squeeze a face to satisfy incompatible target dimensions. The caller
    validates calibrated neck overlap, hair coverage, and final canvas separately.
    Body width/weight is not an input to an arbitrary skull-scale formula.
    """
    source.anatomy.validate();_finite_point(source.attachment);_finite_point(target.attachment)
    _range(target.height_range);_range(target.width_range)
    if not math.isfinite(target.preferred_height) or not target.height_range[0] <= target.preferred_height <= target.height_range[1]:
        raise ValueError('Preferred height outside its calibrated band')
    if not source.calibration_id or not target.calibration_id:
        return FitResult('needs_calibration',None,'Missing pinned semantic geometry')
    if source.view != target.view:
        return FitResult('incompatible_view',None,'Scaling cannot synthesize another viewpoint')
    lo=max(target.height_range[0]/source.anatomy.height,target.width_range[0]/source.anatomy.width)
    hi=min(target.height_range[1]/source.anatomy.height,target.width_range[1]/source.anatomy.width)
    if lo>hi+1e-12:
        return FitResult('needs_source_review',None,'Width and height bands cannot both preserve this aspect ratio')
    scale=min(hi,max(lo,target.preferred_height/source.anatomy.height))
    return FitResult('fitted',Fit(scale,target.attachment[0]-scale*source.attachment[0],target.attachment[1]-scale*source.attachment[1]),'Uniform registration; composited visual acceptance still required')


def warp_group(layers: Iterable[Image.Image], transform: Fit,
               size: tuple[int,int], area=False) -> list[Image.Image]:
    """Apply ONE transform to the head and already-fitted hair/art group.

    Premultiply before interpolation so hidden transparent RGB cannot bleed in.
    This does not invent missing scalp/neck pixels or solve cross-head hair shape.
    """
    affine=transform.inverse_affine()
    if len(size)!=2 or min(size)<=0:
        raise ValueError('Invalid output canvas')
    def warp(im):
        premultiplied=im.convert('RGBA').convert('RGBa')
        matrix=affine
        if area and transform.scale < .5:
            # Scaled Lanczos support integrates source pixels before subpixel
            # placement. The legacy fixed 4x4 affine footprint skipped ink.
            factor=transform.scale*2
            dimensions=(max(1,round(im.width*factor)),max(1,round(im.height*factor)))
            premultiplied=premultiplied.resize(dimensions,Image.Resampling.LANCZOS)
            sx,sy=dimensions[0]/im.width,dimensions[1]/im.height
            matrix=(affine[0]*sx,0,affine[2]*sx,0,affine[4]*sy,affine[5]*sy)
        return premultiplied.transform(size,Image.Transform.AFFINE,matrix,Image.Resampling.BICUBIC).convert('RGBA')
    return [warp(im) for im in layers]


def warp_material_group(paint, maps, transform, size, area=False):
    """Resample material ownership conditional on the paint's coverage.

    Material weight is not a second silhouette alpha. Filtering it as one would
    blend the original pigment back into antialiased edges after recoloring.
    Keep the historical warp_group path available for already frozen sources.
    """
    coverage=np.asarray(paint.convert('RGBA'))[...,3].astype(float)/255
    weighted=[]
    for material in maps:
        pixels=np.array(material.convert('RGBA'))
        pixels[...,3]=np.rint(pixels[...,3]*coverage).astype('uint8')
        weighted.append(Image.fromarray(pixels))
    result=warp_group([paint,*weighted],transform,size,area=area)
    alpha=np.asarray(result[0])[...,3].astype(float)
    normalized=[]
    for material in result[1:]:
        pixels=np.array(material)
        pixels[...,3]=np.divide(pixels[...,3].astype(float)*255,alpha,
            out=np.zeros_like(alpha),where=alpha>0).round().clip(0,255).astype('uint8')
        normalized.append(Image.fromarray(pixels))
    return [result[0],*normalized]


def union_frame(boxes: Iterable[Box], padding: float = 0) -> Box:
    values=list(boxes)
    if not values or padding<0 or not math.isfinite(padding):
        raise ValueError('Nonempty boxes and nonnegative padding required')
    for b in values:b.validate()
    left=min(b.left for b in values)-padding;right=max(b.right for b in values)+padding
    top=min(b.top for b in values)-padding;bottom=max(b.bottom for b in values)+padding
    size=max(right-left,bottom-top);cx=(left+right)/2;cy=(top+bottom)/2
    # A renderer can pad beyond the original canvas; never clip to hide hair.
    return Box(cx-size/2,cy-size/2,cx+size/2,cy+size/2)


def remap_material(image: Image.Image, mask: Image.Image, shade: np.ndarray,
                   ramp: tuple[tuple[int,int,int],tuple[int,int,int],tuple[int,int,int]]) -> Image.Image:
    """Apply an explicit shade map through a SEMANTIC skin/hair mask.

    shade is 0=shadow, .5=neutral, 1=light, authored/derived during preparation.
    Keep alpha and pixels outside the mask byte-identical. This primitive does
    not automatically detect skin, choose ramps, or preserve unmasked lip/ink
    details unless the calibration masks explicitly exclude them.
    """
    rgba=np.asarray(image.convert('RGBA')).copy()
    if mask.size!=image.size or shade.shape!=rgba.shape[:2]:
        raise ValueError('Material maps must match image dimensions')
    if not np.isfinite(shade).all() or ((shade<0)|(shade>1)).any():
        raise ValueError('Shade values must be finite in 0..1')
    r=np.asarray(ramp,dtype=float)
    if r.shape!=(3,3) or not np.isfinite(r).all() or ((r<0)|(r>255)).any():
        raise ValueError('Invalid three-colour ramp')
    weight=np.asarray(mask.convert('L'),dtype=float)/255
    weight*=rgba[:,:,3]>0
    twice=shade*2
    lo=np.minimum(twice,1)[...,None];hi=np.maximum(twice-1,0)[...,None]
    colour=np.where((shade<=.5)[...,None],r[0]+lo*(r[1]-r[0]),r[1]+hi*(r[2]-r[1]))
    active=weight>0
    mixed=np.rint(rgba[:,:,:3]*(1-weight[...,None])+colour*weight[...,None]).clip(0,255).astype(np.uint8)
    rgba[active,:3]=mixed[active]
    return Image.fromarray(rgba)
