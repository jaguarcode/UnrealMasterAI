"""
anim.getBlendSpace script.
Retrieves information about a BlendSpace asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    blend_space_path = get_required_param(params, "blendSpacePath")

    bs = unreal.load_object(None, blend_space_path)
    if bs is None:
        return make_error(5102, f"BlendSpace not found: {blend_space_path}")

    skeleton = bs.get_editor_property("skeleton")
    skeleton_path = str(skeleton.get_path_name()) if skeleton else None

    return make_result(
        blendSpacePath=blend_space_path,
        skeletonPath=skeleton_path,
        assetClass=bs.__class__.__name__,
    )
