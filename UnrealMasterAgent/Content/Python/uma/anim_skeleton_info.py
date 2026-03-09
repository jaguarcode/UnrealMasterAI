"""
anim.getSkeletonInfo script.
Retrieves bone and socket info from a Skeleton asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    skeleton_path = get_required_param(params, "skeletonPath")

    skeleton = unreal.load_object(None, skeleton_path)
    if skeleton is None:
        return make_error(5102, f"Skeleton not found: {skeleton_path}")

    bone_count = skeleton.get_editor_property("reference_skeleton").get_num() if hasattr(skeleton.get_editor_property("reference_skeleton"), "get_num") else 0

    return make_result(
        skeletonPath=skeleton_path,
        assetClass=skeleton.__class__.__name__,
        boneCount=bone_count,
    )
