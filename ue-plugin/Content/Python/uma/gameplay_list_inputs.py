"""
gameplay.listInputActions script.
Lists all input action mappings from the project input settings.
"""
import unreal
from uma.utils import execute_wrapper, make_result


@execute_wrapper
def execute(params):
    input_settings = unreal.InputSettings.get_default_object()
    action_mappings = input_settings.get_editor_property("action_mappings")

    actions = []
    for mapping in action_mappings:
        actions.append({
            "actionName": str(mapping.action_name),
            "key": str(mapping.key.key_name),
            "shift": mapping.shift,
            "ctrl": mapping.ctrl,
            "alt": mapping.alt,
        })

    return make_result(
        actions=actions,
        count=len(actions),
    )
