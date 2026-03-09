"""
physics.getInfo - Read bodies, constraints, and profiles from a PhysicsAsset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "physicsAssetPath")

    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        return make_error(8401, f"PhysicsAsset not found: '{asset_path}'")

    physics_asset = unreal.PhysicsAsset.cast(asset)
    if physics_asset is None:
        return make_error(8402, f"Asset is not a PhysicsAsset: '{asset_path}'")

    # Gather skeletal body setups
    bodies = []
    for body in physics_asset.get_editor_property("skeletalBodySetups") or []:
        body_name = str(body.get_editor_property("bone_name"))
        collision_enabled = str(body.get_editor_property("collision_enabled"))
        bodies.append({"boneName": body_name, "collisionEnabled": collision_enabled})

    # Gather constraints
    constraints = []
    for constraint in physics_asset.get_editor_property("constraintSetup") or []:
        instance = constraint.get_editor_property("default_instance")
        joint_name = str(instance.get_editor_property("joint_name")) if instance else ""
        constraints.append({"jointName": joint_name})

    return make_result(
        physicsAssetPath=asset_path,
        bodies=bodies,
        bodyCount=len(bodies),
        constraints=constraints,
        constraintCount=len(constraints),
    )
