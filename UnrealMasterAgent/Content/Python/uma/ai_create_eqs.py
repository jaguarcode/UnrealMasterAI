"""
ai.createEQS script.
Creates a new Environment Query System (EQS) asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "queryName")
    path = get_required_param(params, "queryPath")
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.EnvQueryFactory()
    eqs = asset_tools.create_asset(name, path, None, factory)
    if eqs is None:
        return make_error(7620, f"Failed to create EQS query '{name}'")
    return make_result(queryName=name, objectPath=str(eqs.get_path_name()))
