"""
level-addSublevel script.
Adds a sublevel to the current world using EditorLevelUtils.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    level_path = get_required_param(params, "levelPath")
    streaming_method = get_optional_param(params, "streamingMethod", default="AlwaysLoaded")

    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5101, "No editor world available")

    # Resolve streaming class
    streaming_class = unreal.LevelStreamingAlwaysLoaded
    if streaming_method == "Blueprint":
        streaming_class = unreal.LevelStreamingDynamic

    new_level = unreal.EditorLevelUtils.add_level_to_world(world, level_path, streaming_class)

    if new_level is None:
        return make_error(5101, f"Failed to add sublevel '{level_path}' to world")

    return make_result(
        levelPath=level_path,
        streamingMethod=streaming_method,
        added=True,
    )
