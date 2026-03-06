"""
build.getMapCheck script.
Runs a map check and returns all errors and warnings.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5301, "No editor world available")

    # Run map check
    map_check_helper = unreal.MapCheckHelper()
    map_check_helper.check_map()

    messages = unreal.MapCheckMessageContainer.get_all_messages()

    errors = []
    warnings = []
    infos = []

    for msg in messages:
        entry = {
            "text": msg.get_message(),
            "category": str(msg.get_message_type()),
            "assetPath": msg.get_asset_path() if hasattr(msg, "get_asset_path") else None,
        }
        msg_type = msg.get_message_type()
        if msg_type == unreal.MapCheckType.ERROR:
            errors.append(entry)
        elif msg_type == unreal.MapCheckType.WARNING:
            warnings.append(entry)
        else:
            infos.append(entry)

    return make_result(
        errors=errors,
        warnings=warnings,
        infos=infos,
        errorCount=len(errors),
        warningCount=len(warnings),
        infoCount=len(infos),
    )
