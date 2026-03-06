"""
gameplay.setGameMode script.
Sets the project default GameMode.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    game_mode_path = get_required_param(params, "gameModePath")

    game_mode_class = unreal.load_class(None, game_mode_path)
    if game_mode_class is None:
        return make_error(5102, f"GameMode class not found: {game_mode_path}")

    settings = unreal.GameMapsSettings.get_default_object()
    settings.set_editor_property("global_default_game_mode", game_mode_class)
    unreal.SystemLibrary.execute_console_command(None, "SaveConfig")

    return make_result(
        gameModePath=game_mode_path,
        applied=True,
    )
