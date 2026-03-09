"""
physics.setConstraint - Configure constraint limits on a PhysicsAsset constraint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "physicsAssetPath")
    constraint_name = get_required_param(params, "constraintName")
    linear_limit = get_optional_param(params, "linearLimit")
    angular_limit = get_optional_param(params, "angularLimit")

    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        return make_error(8430, f"PhysicsAsset not found: '{asset_path}'")

    physics_asset = unreal.PhysicsAsset.cast(asset)
    if physics_asset is None:
        return make_error(8431, f"Asset is not a PhysicsAsset: '{asset_path}'")

    target_constraint = None
    for constraint in physics_asset.get_editor_property("constraintSetup") or []:
        instance = constraint.get_editor_property("default_instance")
        if instance and str(instance.get_editor_property("joint_name")) == constraint_name:
            target_constraint = instance
            break

    if target_constraint is None:
        return make_error(8432, f"Constraint '{constraint_name}' not found in PhysicsAsset '{asset_path}'")

    if linear_limit is not None:
        linear_lim = target_constraint.get_editor_property("linear_limit")
        if linear_lim is not None:
            linear_lim.set_editor_property("limit", float(linear_limit))

    if angular_limit is not None:
        swing1_lim = target_constraint.get_editor_property("cone_angle")
        if swing1_lim is not None:
            target_constraint.set_editor_property("cone_angle", float(angular_limit))

    unreal.EditorAssetLibrary.save_asset(asset_path)

    return make_result(
        physicsAssetPath=asset_path,
        constraintName=constraint_name,
        linearLimit=linear_limit,
        angularLimit=angular_limit,
        updated=True,
    )
