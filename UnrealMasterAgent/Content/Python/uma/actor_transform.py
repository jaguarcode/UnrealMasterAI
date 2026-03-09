"""
actor.setTransform script.
Sets the location, rotation, and/or scale of a named actor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


def _find_actor(name):
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == name:
            return a
    return None


@execute_wrapper
def execute(params):
    actor_name = get_required_param(params, "actorName")
    location_raw = get_optional_param(params, "location")
    rotation_raw = get_optional_param(params, "rotation")
    scale_raw = get_optional_param(params, "scale")

    actor = _find_actor(actor_name)
    if actor is None:
        return make_error(5102, f"Actor not found: {actor_name}")

    if location_raw:
        loc = unreal.Vector(
            float(location_raw.get("x", 0)),
            float(location_raw.get("y", 0)),
            float(location_raw.get("z", 0)),
        )
        actor.set_actor_location(loc, False, True)

    if rotation_raw:
        rot = unreal.Rotator(
            float(rotation_raw.get("pitch", 0)),
            float(rotation_raw.get("yaw", 0)),
            float(rotation_raw.get("roll", 0)),
        )
        actor.set_actor_rotation(rot, True)

    if scale_raw:
        scale = unreal.Vector(
            float(scale_raw.get("x", 1)),
            float(scale_raw.get("y", 1)),
            float(scale_raw.get("z", 1)),
        )
        actor.set_actor_scale3d(scale)

    t = actor.get_actor_transform()
    loc = t.translation
    rot = t.rotation.rotator()
    s = t.scale3d

    return make_result(
        actorName=actor_name,
        location={"x": loc.x, "y": loc.y, "z": loc.z},
        rotation={"pitch": rot.pitch, "yaw": rot.yaw, "roll": rot.roll},
        scale={"x": s.x, "y": s.y, "z": s.z},
    )
