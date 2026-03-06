"""
level-open script.
Opens an existing level in the Unreal editor using EditorLevelLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    level_path = get_required_param(params, "levelPath")

    success = unreal.EditorLevelLibrary.load_level(level_path)

    if not success:
        return make_error(5101, f"Failed to open level '{level_path}'")

    return make_result(
        levelPath=level_path,
        opened=True,
    )
