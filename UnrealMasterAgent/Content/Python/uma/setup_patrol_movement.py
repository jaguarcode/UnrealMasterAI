"""
setup_patrol_movement.py
Configures the InterpToMovementComponent on BP_PatrolActor
with control points matching the PatrolPoint actor positions.
The component handles smooth interpolated movement automatically.
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
    steps = []

    # Find patrol point positions
    patrol_points = []
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        label = a.get_actor_label()
        if label and label.startswith("PatrolPoint_"):
            loc = a.get_actor_location()
            patrol_points.append((label, loc))

    patrol_points.sort(key=lambda x: x[0])  # Sort by name
    if not patrol_points:
        return make_error(9700, "No PatrolPoint actors found in level")
    steps.append(f"Found {len(patrol_points)} patrol points")

    # Find the PatrolActor
    patrol_actor = None
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "PatrolActor":
            patrol_actor = a
            break

    if not patrol_actor:
        return make_error(9701, "PatrolActor not found in level")

    # Get InterpToMovementComponent
    interp_comps = patrol_actor.get_components_by_class(unreal.InterpToMovementComponent)
    if not interp_comps:
        steps.append("No InterpToMovementComponent found on instance, checking BP...")
        # The component might not be on the spawned instance yet
        # Let's respawn from the updated BP
        bp = unreal.load_asset("/Game/Blueprints/BP_PatrolActor")
        if bp:
            _compile_bp(bp)
            old_loc = patrol_actor.get_actor_location()
            patrol_actor.destroy_actor()
            gen_class = bp.generated_class()
            patrol_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(gen_class, old_loc)
            if patrol_actor:
                patrol_actor.set_actor_label("PatrolActor")
                # Re-set mesh and material
                cone_mesh = unreal.load_asset("/Engine/BasicShapes/Cone")
                mat = unreal.load_asset("/Game/Materials/M_PatrolActor")
                comps = patrol_actor.get_components_by_class(unreal.StaticMeshComponent)
                if comps:
                    if cone_mesh:
                        comps[0].set_static_mesh(cone_mesh)
                        comps[0].set_world_scale3d(unreal.Vector(0.5, 0.5, 0.5))
                    if mat:
                        comps[0].set_material(0, mat)
                lights = patrol_actor.get_components_by_class(unreal.PointLightComponent)
                if lights:
                    lights[0].set_editor_property("intensity", 5000.0)
                    lights[0].set_editor_property("light_color", unreal.Color(255, 150, 30, 255))
                    lights[0].set_editor_property("attenuation_radius", 300.0)
                    lights[0].set_editor_property("cast_shadows", False)
                steps.append("Respawned PatrolActor with components")
                interp_comps = patrol_actor.get_components_by_class(unreal.InterpToMovementComponent)

    if not interp_comps:
        return make_error(9702, "InterpToMovementComponent not found on PatrolActor")

    interp = interp_comps[0]

    # Configure the InterpToMovement component
    # Control points are relative offsets from the actor's start position
    actor_origin = patrol_actor.get_actor_location()

    control_points = []
    for name, loc in patrol_points:
        # Calculate relative offset from actor origin
        offset = unreal.Vector(
            loc.x - actor_origin.x,
            loc.y - actor_origin.y,
            loc.z - actor_origin.z
        )
        cp = unreal.InterpControlPoint()
        cp.set_editor_property("position_control_point", offset)
        control_points.append(cp)
        steps.append(f"  {name}: offset=({offset.x:.0f}, {offset.y:.0f}, {offset.z:.0f})")

    # Set control points on the component
    interp.set_editor_property("control_points", control_points)

    # Configure movement behavior
    interp.set_editor_property("duration", 4.0)  # 4 seconds per full cycle
    interp.set_editor_property("behaviour_type", unreal.InterpToBehaviourType.LOOP_RESET)
    interp.set_editor_property("auto_activate", True)

    # Log actual behaviour type
    try:
        btype = interp.get_editor_property("behaviour_type")
        steps.append(f"Configured InterpToMovement: duration=4s, behaviour={btype}, auto-activate")
    except Exception:
        steps.append("Configured InterpToMovement: duration=4s, auto-activate")

    # Save
    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="Patrol movement configured! The PatrolActor will move between patrol points when you press Play.",
        steps=steps,
    )
