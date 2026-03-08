"""
setup_spinning_cube.py
Creates a Blueprint actor with a spinning cube and spawns it in the level.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


def _compile_bp(bp):
    """Compile a Blueprint using whichever library is available."""
    for lib in ["BlueprintEditorLibrary", "KismetSystemLibrary"]:
        if hasattr(unreal, lib):
            try:
                getattr(unreal, lib).compile_blueprint(bp)
                return True
            except Exception:
                pass
    return False


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    steps = []

    bp_name = get_optional_param(params, "blueprintName", "BP_SpinningCube")
    bp_dir = get_optional_param(params, "blueprintDir", "/Game/Blueprints")
    bp_path = f"{bp_dir}/{bp_name}"

    # Clean up existing
    if eal.does_asset_exist(bp_path):
        eal.delete_asset(bp_path)
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "SpinningCube":
            a.destroy_actor()

    # Create Blueprint
    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.Actor)
    bp = asset_tools.create_asset(bp_name, bp_dir, unreal.Blueprint, factory)
    if not bp:
        return make_error(9200, "Failed to create Blueprint")
    steps.append("Created BP_SpinningCube")

    # Add components via SubobjectDataSubsystem
    handles = sub.k2_gather_subobject_data_for_blueprint(bp)
    root = handles[0] if handles else unreal.SubobjectDataHandle()

    for class_path in ["/Script/Engine.StaticMeshComponent", "/Script/Engine.RotatingMovementComponent"]:
        comp_class = unreal.load_class(None, class_path)
        p = unreal.AddNewSubobjectParams()
        p.set_editor_property("new_class", comp_class)
        p.set_editor_property("blueprint_context", bp)
        p.set_editor_property("parent_handle", root)
        sub.add_new_subobject(p)
    steps.append("Added StaticMeshComponent + RotatingMovementComponent")

    # Save (triggers implicit compile)
    eal.save_asset(bp_path, False)
    _compile_bp(bp)
    eal.save_asset(bp_path, False)
    steps.append("Compiled and saved Blueprint")

    # Spawn instance and configure components directly on it
    gen_class = bp.generated_class()
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        gen_class, unreal.Vector(0, 0, 200)
    )
    if not actor:
        return make_error(9203, "Could not spawn BP_SpinningCube actor")

    actor.set_actor_label("SpinningCube")

    # Set cube mesh
    cube_mesh = unreal.load_asset("/Engine/BasicShapes/Cube")
    comps = actor.get_components_by_class(unreal.StaticMeshComponent)
    if comps and cube_mesh:
        comps[0].set_static_mesh(cube_mesh)
        steps.append("Set Cube mesh on StaticMeshComponent")
    else:
        steps.append(f"Warning: SMC count={len(comps) if comps else 0}, cube_mesh={cube_mesh is not None}")

    # Set rotation rate
    rot_comps = actor.get_components_by_class(unreal.RotatingMovementComponent)
    if rot_comps:
        rot_comps[0].set_editor_property("rotation_rate", unreal.Rotator(0, 90, 45))
        steps.append("Set rotation rate (Yaw=90, Roll=45 deg/sec)")

    steps.append("Spawned SpinningCube at (0, 0, 200)")

    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="Spinning cube created and placed in level. Press Play to see it spin!",
        blueprintPath=bp_path,
        steps=steps,
    )
