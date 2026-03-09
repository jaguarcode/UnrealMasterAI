"""
ai.getBlackboardKeys script.
Returns all keys defined in a Blackboard asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    bb_path = get_required_param(params, "blackboardPath")
    bb = unreal.load_object(None, bb_path)
    if bb is None:
        return make_error(7603, f"Blackboard not found: {bb_path}")
    keys = []
    for key in bb.get_editor_property("keys"):
        keys.append({
            "keyName": str(key.get_editor_property("entry_name")),
            "keyType": type(key.get_editor_property("key_type")).__name__,
        })
    return make_result(blackboardPath=bb_path, keys=keys, count=len(keys))
