"""
gameplay.addInputAction script.
Adds an input action mapping to the project input settings.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    action_name = get_required_param(params, "actionName")
    key_name = get_required_param(params, "key")
    shift = get_optional_param(params, "shift") or False
    ctrl = get_optional_param(params, "ctrl") or False
    alt = get_optional_param(params, "alt") or False

    input_settings = unreal.InputSettings.get_default_object()

    mapping = unreal.InputActionKeyMapping()
    mapping.action_name = unreal.Name(action_name)
    mapping.key = unreal.Key(key_name)
    mapping.shift = shift
    mapping.ctrl = ctrl
    mapping.alt = alt

    input_settings.add_action_mapping(mapping)
    input_settings.save_config()

    return make_result(
        actionName=action_name,
        key=key_name,
        shift=shift,
        ctrl=ctrl,
        alt=alt,
        added=True,
    )
