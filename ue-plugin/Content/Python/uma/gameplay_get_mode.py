"""
gameplay.getGameMode script.
Returns the current project default GameMode.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    settings = unreal.GameMapsSettings.get_default_object()
    game_mode_class = settings.get_editor_property("global_default_game_mode")

    if game_mode_class is None:
        return make_result(gameModePath=None, message="No default GameMode set")

    return make_result(
        gameModePath=str(game_mode_class.get_path_name()),
    )
