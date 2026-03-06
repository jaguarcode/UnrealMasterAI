"""
actor.addComponent script.
Adds a component of the specified class to a named actor.
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
    component_class_name = get_required_param(params, "componentClass")
    component_name = get_optional_param(params, "componentName")

    actor = _find_actor(actor_name)
    if actor is None:
        return make_error(5102, f"Actor not found: {actor_name}")

    # Resolve component class
    comp_class = unreal.load_class(None, component_class_name)
    if comp_class is None:
        return make_error(5102, f"Component class not found: {component_class_name}")

    new_comp = actor.add_component_by_class(comp_class)
    if new_comp is None:
        return make_error(5101, f"Failed to add component '{component_class_name}' to '{actor_name}'")

    if component_name:
        new_comp.rename(component_name)

    return make_result(
        actorName=actor_name,
        componentClass=component_class_name,
        componentName=new_comp.get_name(),
        added=True,
    )
