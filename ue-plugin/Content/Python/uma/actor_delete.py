"""
actor.delete script.
Deletes a named actor from the current level.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    actor_name = get_required_param(params, "actorName")

    # Find actor by label in the current level
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    target = None
    for a in all_actors:
        if a.get_actor_label() == actor_name:
            target = a
            break

    if target is None:
        return make_error(5102, f"Actor not found: {actor_name}")

    success = unreal.EditorLevelLibrary.destroy_actor(target)
    if not success:
        return make_error(5101, f"Failed to delete actor '{actor_name}'")

    return make_result(deleted=True, actorName=actor_name)
