"""
actor.getComponents script.
Returns all components attached to a named actor.
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

    components = actor.get_components_by_class(unreal.ActorComponent)
    component_list = []
    for comp in components:
        component_list.append({
            "name": comp.get_name(),
            "class": comp.get_class().get_name(),
        })

    return make_result(actorName=actor_name, components=component_list, count=len(component_list))
