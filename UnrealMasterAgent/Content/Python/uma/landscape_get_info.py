"""
landscape.get_info script.
Gets info about a landscape actor (component count, size, layers).
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    landscape_name = get_optional_param(params, "landscapeName", "")

    editor_world = unreal.EditorLevelLibrary.get_editor_world()
    if editor_world is None:
        return make_error(8330, "Could not get editor world")

    landscapes = unreal.GameplayStatics.get_all_actors_of_class(editor_world, unreal.Landscape)
    if not landscapes:
        return make_error(8331, "No landscape actors found in the current level")

    if landscape_name:
        target = None
        for actor in landscapes:
            if actor.get_actor_label() == landscape_name:
                target = actor
                break
        if target is None:
            return make_error(8332, f"Landscape actor '{landscape_name}' not found")
        landscapes = [target]

    results = []
    for actor in landscapes:
        info = {
            "name": actor.get_actor_label(),
            "location": str(actor.get_actor_location()),
            "scale": str(actor.get_actor_scale3d()),
        }
        results.append(info)

    return make_result(
        landscapes=results,
        count=len(results),
    )
