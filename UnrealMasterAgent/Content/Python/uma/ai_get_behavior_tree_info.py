"""
ai.getBehaviorTreeInfo script.
Returns metadata about an existing BehaviorTree asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    tree_path = get_required_param(params, "treePath")
    bt = unreal.load_object(None, tree_path)
    if bt is None:
        return make_error(7602, f"BehaviorTree not found: {tree_path}")
    blackboard = bt.get_editor_property("blackboard_asset")
    bb_path = str(blackboard.get_path_name()) if blackboard else None
    return make_result(
        treePath=tree_path,
        assetClass=type(bt).__name__,
        blackboardPath=bb_path,
    )
