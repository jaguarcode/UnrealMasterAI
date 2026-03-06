"""
level-save script.
Saves the current level in the Unreal editor using EditorLevelLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    success = unreal.EditorLevelLibrary.save_current_level()

    if not success:
        return make_error(5101, "Failed to save current level")

    return make_result(saved=True)
