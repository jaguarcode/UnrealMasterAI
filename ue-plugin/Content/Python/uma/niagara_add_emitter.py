"""
niagara.addEmitter script.
Adds an emitter to a Niagara System, optionally from a template.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    system_path = get_required_param(params, "systemPath")
    emitter_name = get_required_param(params, "emitterName")
    template_path = get_optional_param(params, "templatePath")

    validate_path(system_path)

    system = unreal.load_asset(system_path)
    if system is None:
        return make_error(8103, f"Niagara System not found: '{system_path}'")

    if not isinstance(system, unreal.NiagaraSystem):
        return make_error(8104, f"Asset at '{system_path}' is not a NiagaraSystem")

    emitter = None
    if template_path:
        validate_path(template_path)
        emitter = unreal.load_asset(template_path)
        if emitter is None:
            return make_error(8105, f"Niagara Emitter template not found: '{template_path}'")

    system_editor_lib = unreal.NiagaraSystemEditorLibrary
    if emitter is not None:
        system_editor_lib.add_emitter_from_asset(system, emitter)
    else:
        system_editor_lib.add_empty_emitter(system)

    unreal.EditorAssetLibrary.save_asset(system_path)

    return make_result(
        systemPath=system_path,
        emitterName=emitter_name,
        templatePath=template_path,
        added=True,
    )
