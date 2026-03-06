"""
actor.spawn script.
Spawns an actor of the given class into the current level.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    class_name = get_required_param(params, "className")
    location_raw = get_optional_param(params, "location")
    rotation_raw = get_optional_param(params, "rotation")
    label = get_optional_param(params, "label")

    # Resolve actor class
    actor_class = None

    # Try as Blueprint asset path first (e.g., /Game/BP_MyActor)
    if class_name.startswith("/"):
        asset = unreal.EditorAssetLibrary.load_asset(class_name)
        if asset is not None:
            bp = unreal.BlueprintGeneratedClass.cast(asset.generated_class()) if hasattr(asset, "generated_class") else None
            if bp is not None:
                actor_class = bp
            else:
                actor_class = asset.get_class()

    # Try as fully qualified class path (e.g., /Script/Engine.StaticMeshActor)
    if actor_class is None:
        actor_class = unreal.load_class(None, class_name)

    # Try as short C++ class name — prepend /Script/ProjectName.ClassName
    if actor_class is None:
        # Try common module paths
        for module in [unreal.SystemLibrary.get_project_name(), "Engine", "CoreUObject"]:
            full_path = f"/Script/{module}.{class_name}"
            actor_class = unreal.load_class(None, full_path)
            if actor_class is not None:
                break

    if actor_class is None:
        return make_error(5102, f"Actor class not found: {class_name}")

    # Build transform
    loc = unreal.Vector(0.0, 0.0, 0.0)
    if location_raw:
        loc = unreal.Vector(
            float(location_raw.get("x", 0)),
            float(location_raw.get("y", 0)),
            float(location_raw.get("z", 0)),
        )

    rot = unreal.Rotator(0.0, 0.0, 0.0)
    if rotation_raw:
        rot = unreal.Rotator(
            float(rotation_raw.get("pitch", 0)),
            float(rotation_raw.get("yaw", 0)),
            float(rotation_raw.get("roll", 0)),
        )

    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(actor_class, loc, rot)
    if actor is None:
        return make_error(5101, f"Failed to spawn actor of class '{class_name}'")

    if label:
        actor.set_actor_label(label)

    return make_result(
        actorName=actor.get_actor_label(),
        className=class_name,
        location={"x": loc.x, "y": loc.y, "z": loc.z},
        rotation={"pitch": rot.pitch, "yaw": rot.yaw, "roll": rot.roll},
    )
