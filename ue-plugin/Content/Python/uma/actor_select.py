"""
actor.select script.
Selects one or more actors in the Unreal Editor viewport by name.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    actor_names = get_required_param(params, "actorNames")
    deselect_others = get_optional_param(params, "deselectOthers")
    if deselect_others is None:
        deselect_others = True

    if deselect_others:
        unreal.EditorLevelLibrary.set_selected_level_actors([])

    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    name_set = set(actor_names)
    found = []
    missing = []

    for actor in all_actors:
        if actor.get_actor_label() in name_set:
            unreal.EditorLevelLibrary.set_actor_selection_state(actor, True)
            found.append(actor.get_actor_label())

    missing = [n for n in actor_names if n not in found]

    if missing:
        return make_error(5102, f"Actors not found: {missing}")

    return make_result(selected=found, count=len(found))
