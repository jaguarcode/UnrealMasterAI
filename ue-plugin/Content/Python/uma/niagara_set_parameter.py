"""
niagara.setParameter script.
Sets a user parameter value on a Niagara System.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    system_path = get_required_param(params, "systemPath")
    parameter_name = get_required_param(params, "parameterName")
    value = params.get("value")
    if value is None and "value" not in params:
        from uma.utils import make_error
        return make_error(8106, "Missing required parameter: value")

    validate_path(system_path)

    system = unreal.load_asset(system_path)
    if system is None:
        return make_error(8107, f"Niagara System not found: '{system_path}'")

    if not isinstance(system, unreal.NiagaraSystem):
        return make_error(8108, f"Asset at '{system_path}' is not a NiagaraSystem")

    niagara_lib = unreal.NiagaraFunctionLibrary
    param_name_obj = unreal.NiagaraParameterStore()

    # Use the editor library to set the exposed parameter
    editor_lib = unreal.NiagaraSystemEditorLibrary
    try:
        editor_lib.set_parameter_value(system, parameter_name, value)
    except Exception as e:
        return make_error(8109, f"Failed to set parameter '{parameter_name}': {str(e)}")

    unreal.EditorAssetLibrary.save_asset(system_path)

    return make_result(
        systemPath=system_path,
        parameterName=parameter_name,
        value=value,
        updated=True,
    )
