"""
actor.getProperties script.
Returns all readable properties of a named actor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


def _find_actor(name):
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == name:
            return a
    return None


@execute_wrapper
def execute(params):
    actor_name = get_required_param(params, "actorName")

    actor = _find_actor(actor_name)
    if actor is None:
        return make_error(5102, f"Actor not found: {actor_name}")

    t = actor.get_actor_transform()
    loc = t.translation
    rot = t.rotation.rotator()
    scale = t.scale3d

    properties = {
        "label": actor.get_actor_label(),
        "class": actor.get_class().get_name(),
        "location": {"x": loc.x, "y": loc.y, "z": loc.z},
        "rotation": {"pitch": rot.pitch, "yaw": rot.yaw, "roll": rot.roll},
        "scale": {"x": scale.x, "y": scale.y, "z": scale.z},
        "hidden": actor.is_hidden_ed(),
        "tags": [str(tag) for tag in actor.tags],
    }

    return make_result(actorName=actor_name, properties=properties)
