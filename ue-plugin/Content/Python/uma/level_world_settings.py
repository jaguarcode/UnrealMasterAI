"""
level-getWorldSettings script.
Retrieves world settings for the current level using EditorLevelLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5101, "No editor world available")

    world_settings = world.get_world_settings()
    if world_settings is None:
        return make_error(5101, "Failed to retrieve world settings")

    return make_result(
        worldName=world.get_name(),
        killZValue=world_settings.kill_z_value,
        enableWorldBoundsChecks=world_settings.enable_world_bounds_checks,
        navigationSystemConfig=str(world_settings.navigation_system_config.__class__.__name__)
            if world_settings.navigation_system_config else None,
        defaultGameMode=str(world_settings.default_game_mode.__name__)
            if world_settings.default_game_mode else None,
        gravityZ=world_settings.global_gravity_set,
    )
