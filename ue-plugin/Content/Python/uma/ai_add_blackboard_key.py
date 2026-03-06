"""
ai.addBlackboardKey script.
Adds a new key to an existing Blackboard asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param

KEY_TYPE_MAP = {
    "bool": unreal.BlackboardKeyType_Bool,
    "class": unreal.BlackboardKeyType_Class,
    "enum": unreal.BlackboardKeyType_Enum,
    "float": unreal.BlackboardKeyType_Float,
    "int": unreal.BlackboardKeyType_Int,
    "name": unreal.BlackboardKeyType_Name,
    "object": unreal.BlackboardKeyType_Object,
    "rotator": unreal.BlackboardKeyType_Rotator,
    "string": unreal.BlackboardKeyType_String,
    "vector": unreal.BlackboardKeyType_Vector,
}


@execute_wrapper
def execute(params):
    bb_path = get_required_param(params, "blackboardPath")
    key_name = get_required_param(params, "keyName")
    key_type_str = get_required_param(params, "keyType").lower()

    bb = unreal.load_object(None, bb_path)
    if bb is None:
        return make_error(7604, f"Blackboard not found: {bb_path}")

    key_type_class = KEY_TYPE_MAP.get(key_type_str)
    if key_type_class is None:
        return make_error(7605, f"Unknown key type '{key_type_str}'. Valid: {list(KEY_TYPE_MAP.keys())}")

    new_key = unreal.BlackboardEntry()
    new_key.set_editor_property("entry_name", key_name)
    new_key.set_editor_property("key_type", key_type_class())

    keys = list(bb.get_editor_property("keys"))
    keys.append(new_key)
    bb.set_editor_property("keys", keys)
    bb.modify()

    return make_result(blackboardPath=bb_path, keyName=key_name, keyType=key_type_str)
