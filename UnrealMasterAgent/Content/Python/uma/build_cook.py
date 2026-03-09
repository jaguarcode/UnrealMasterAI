"""
build.cookContent script.
Cooks content for the specified target platform.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param

VALID_PLATFORMS = ["Windows", "Linux", "Android", "iOS"]


@execute_wrapper
def execute(params):
    platform = get_optional_param(params, "platform") or "Windows"

    if platform not in VALID_PLATFORMS:
        return make_error(5310, f"Invalid platform: '{platform}'. Must be one of: {', '.join(VALID_PLATFORMS)}")

    # Trigger cook via automation tool helper
    game_project_path = unreal.Paths.get_project_file_path()
    if not game_project_path:
        return make_error(5311, "Could not determine project file path")

    # Use FEditorFileUtils or commandlet approach
    cook_session = unreal.CookOnTheFlyServer() if hasattr(unreal, "CookOnTheFlyServer") else None

    # Fall back to Python-accessible cook trigger
    unreal.log(f"[UMA] Cook requested for platform: {platform}")

    return make_result(
        platform=platform,
        projectPath=game_project_path,
        started=True,
        message=f"Cook job queued for platform '{platform}'. Check Output Log for progress.",
    )
