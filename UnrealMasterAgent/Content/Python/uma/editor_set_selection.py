"""
editor.setSelection script.
Sets the viewport actor selection using EditorActorSubsystem.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    actor_names = get_required_param(params, "actorNames", list)
    deselect_others = get_optional_param(params, "deselectOthers", True)

    subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

    if deselect_others:
        subsystem.select_nothing()

    all_actors = subsystem.get_all_level_actors()
    name_set = set(actor_names)
    found = []

    for actor in all_actors:
        label = actor.get_actor_label()
        if label in name_set:
            subsystem.set_actor_selection_state(actor, True)
            found.append(label)

    missing = [n for n in actor_names if n not in found]

    if missing:
        return make_error(5102, f"Actors not found: {missing}")

    return make_result(selected=found, count=len(found))
