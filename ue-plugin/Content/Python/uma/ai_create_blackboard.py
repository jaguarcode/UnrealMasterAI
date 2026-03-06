"""
ai.createBlackboard script.
Creates a new Blackboard asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "blackboardName")
    path = get_required_param(params, "blackboardPath")
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.BlackboardDataFactory()
    bb = asset_tools.create_asset(name, path, None, factory)
    if bb is None:
        return make_error(7601, f"Failed to create Blackboard '{name}'")
    return make_result(blackboardName=name, objectPath=str(bb.get_path_name()))
