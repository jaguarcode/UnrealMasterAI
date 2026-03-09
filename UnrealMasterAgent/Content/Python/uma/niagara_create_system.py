"""
niagara.createSystem script.
Creates a new Niagara System asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    name = get_required_param(params, "systemName")
    path = get_required_param(params, "systemPath")

    validate_path(path)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.NiagaraSystemFactoryNew()

    system = asset_tools.create_asset(name, path, None, factory)
    if system is None:
        return make_error(8100, f"Failed to create Niagara System '{name}' at '{path}'")

    return make_result(
        systemName=name,
        systemPath=path,
        objectPath=str(system.get_path_name()),
    )
