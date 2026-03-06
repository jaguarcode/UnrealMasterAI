"""
physics.setProfile - Set a collision profile on a body within a PhysicsAsset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    body_name = get_required_param(params, "bodyName")
    profile_name = get_required_param(params, "profileName")

    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        return make_error(8410, f"PhysicsAsset not found: '{asset_path}'")

    physics_asset = unreal.PhysicsAsset.cast(asset)
    if physics_asset is None:
        return make_error(8411, f"Asset is not a PhysicsAsset: '{asset_path}'")

    target_body = None
    for body in physics_asset.get_editor_property("skeletalBodySetups") or []:
        if str(body.get_editor_property("bone_name")) == body_name:
            target_body = body
            break

    if target_body is None:
        return make_error(8412, f"Body '{body_name}' not found in PhysicsAsset '{asset_path}'")

    target_body.set_collision_profile_name(unreal.Name(profile_name))
    unreal.EditorAssetLibrary.save_asset(asset_path)

    return make_result(
        assetPath=asset_path,
        bodyName=body_name,
        profileName=profile_name,
        updated=True,
    )
