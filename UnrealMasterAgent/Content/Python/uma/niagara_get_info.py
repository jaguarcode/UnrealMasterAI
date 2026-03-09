"""
niagara.getInfo script.
Reads emitters, modules, and user parameters from a Niagara System.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    system_path = get_required_param(params, "systemPath")

    validate_path(system_path)

    system = unreal.load_asset(system_path)
    if system is None:
        return make_error(8101, f"Niagara System not found: '{system_path}'")

    if not isinstance(system, unreal.NiagaraSystem):
        return make_error(8102, f"Asset at '{system_path}' is not a NiagaraSystem")

    emitters = []
    for emitter_handle in system.get_editor_property("emitter_handles"):
        emitter_info = {
            "name": str(emitter_handle.get_editor_property("name")),
            "isEnabled": bool(emitter_handle.get_editor_property("is_enabled")),
        }
        emitters.append(emitter_info)

    user_params = []
    try:
        param_store = system.get_editor_property("exposed_parameters")
        if param_store is not None:
            for param in param_store.get_editor_property("parameters"):
                user_params.append({
                    "name": str(param.get_editor_property("parameter_name")),
                    "type": str(param.get_editor_property("parameter_type")),
                })
    except Exception:
        pass

    return make_result(
        systemPath=system_path,
        objectPath=str(system.get_path_name()),
        emitters=emitters,
        emitterCount=len(emitters),
        userParameters=user_params,
    )
