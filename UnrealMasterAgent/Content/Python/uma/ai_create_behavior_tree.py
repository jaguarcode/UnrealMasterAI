"""
ai.createBehaviorTree script.
Creates a new BehaviorTree asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "treeName")
    path = get_required_param(params, "treePath")
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.BehaviorTreeFactory()
    bt = asset_tools.create_asset(name, path, None, factory)
    if bt is None:
        return make_error(7600, f"Failed to create BehaviorTree '{name}'")
    return make_result(treeName=name, objectPath=str(bt.get_path_name()))
