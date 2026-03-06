"""
build.lightmaps script.
Builds lightmaps for the current level at the specified quality.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param

QUALITY_MAP = {
    "Preview": unreal.LightingBuildQuality.QUALITY_PREVIEW,
    "Medium": unreal.LightingBuildQuality.QUALITY_MEDIUM,
    "High": unreal.LightingBuildQuality.QUALITY_HIGH,
    "Production": unreal.LightingBuildQuality.QUALITY_PRODUCTION,
}


@execute_wrapper
def execute(params):
    quality_str = get_optional_param(params, "quality") or "Preview"

    quality = QUALITY_MAP.get(quality_str)
    if quality is None:
        return make_error(5300, f"Invalid quality: '{quality_str}'. Must be one of: Preview, Medium, High, Production")

    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5301, "No editor world available")

    unreal.EditorLevelLibrary.build_lighting(quality)

    return make_result(quality=quality_str, world=world.get_name(), started=True)
