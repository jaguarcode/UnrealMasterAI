"""
actor.setProperty script.
Sets a named property on an actor using Unreal's property system.
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
    property_name = get_required_param(params, "propertyName")
    property_value = get_required_param(params, "propertyValue")

    actor = _find_actor(actor_name)
    if actor is None:
        return make_error(5102, f"Actor not found: {actor_name}")

    try:
        # Use set_editor_property for Blueprint-exposed properties
        actor.set_editor_property(property_name, property_value)
    except Exception as e:
        return make_error(5103, f"Failed to set property '{property_name}': {str(e)}")

    return make_result(
        actorName=actor_name,
        propertyName=property_name,
        propertyValue=property_value,
        updated=True,
    )
