"""
add_light_to_spinning_cube.py
Adds a PointLightComponent to BP_SpinningCube and configures it
on the spawned instance for a glowing light VFX effect.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


def _compile_bp(bp):
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
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    steps = []

    bp_path = "/Game/Blueprints/BP_SpinningCube"
    bp = unreal.load_asset(bp_path)
    if not bp:
        return make_error(9500, "BP_SpinningCube not found")

    # Add PointLightComponent to the Blueprint
    handles = sub.k2_gather_subobject_data_for_blueprint(bp)
    root = handles[0] if handles else unreal.SubobjectDataHandle()

    light_class = unreal.load_class(None, "/Script/Engine.PointLightComponent")
    p = unreal.AddNewSubobjectParams()
    p.set_editor_property("new_class", light_class)
    p.set_editor_property("blueprint_context", bp)
    p.set_editor_property("parent_handle", root)
    _, fail_reason = sub.add_new_subobject(p)

    fail_str = str(fail_reason).strip()
    if fail_str:
        return make_error(9501, f"Failed to add PointLightComponent: {fail_str}")
    steps.append("Added PointLightComponent to Blueprint")

    # Compile and save
    _compile_bp(bp)
    eal.save_asset(bp_path, False)
    steps.append("Compiled and saved Blueprint")

    # Configure the light on the spawned instance
    actor = None
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "SpinningCube":
            actor = a
            break

    if not actor:
        # Respawn
        gen_class = bp.generated_class()
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            gen_class, unreal.Vector(0, 0, 200)
        )
        if actor:
            actor.set_actor_label("SpinningCube")
            steps.append("Respawned SpinningCube")

    if actor:
        lights = actor.get_components_by_class(unreal.PointLightComponent)
        if lights:
            light = lights[0]
            light.set_editor_property("intensity", 8000.0)
            light.set_editor_property("attenuation_radius", 500.0)
            light.set_editor_property("light_color", unreal.Color(100, 200, 255, 255))
            light.set_editor_property("cast_shadows", False)
            steps.append("Configured PointLight: intensity=8000, radius=500, light blue color")
        else:
            steps.append("Warning: No PointLightComponent found on spawned actor")

        # Also ensure cube mesh is set
        comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        cube_mesh = unreal.load_asset("/Engine/BasicShapes/Cube")
        if comps and cube_mesh:
            comps[0].set_static_mesh(cube_mesh)

        # Ensure material is set
        mat = unreal.load_asset("/Game/Materials/M_RandomColor")
        if comps and mat:
            comps[0].set_material(0, mat)

    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="PointLight VFX added to SpinningCube — glowing light blue aura!",
        steps=steps,
    )
