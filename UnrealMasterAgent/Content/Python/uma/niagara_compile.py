"""
niagara.compile script.
Compiles a Niagara System asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    system_path = get_required_param(params, "systemPath")

    validate_path(system_path)

    system = unreal.load_asset(system_path)
    if system is None:
        return make_error(8110, f"Niagara System not found: '{system_path}'")

    if not isinstance(system, unreal.NiagaraSystem):
        return make_error(8111, f"Asset at '{system_path}' is not a NiagaraSystem")

    try:
        niagara_editor_lib = unreal.NiagaraSystemEditorLibrary
        niagara_editor_lib.compile_system(system, wait_for_completion=True)
    except Exception as e:
        return make_error(8112, f"Failed to compile Niagara System '{system_path}': {str(e)}")

    unreal.EditorAssetLibrary.save_asset(system_path)

    return make_result(
        systemPath=system_path,
        objectPath=str(system.get_path_name()),
        compiled=True,
    )
