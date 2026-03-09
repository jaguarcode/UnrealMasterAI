"""
Workflow: Setup Level
Error codes: 9020-9029
Creates a level and spawns player start, directional light, sky sphere.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9020)
def execute(args: dict) -> dict:
    level_name = get_required_param(args, 'levelName')
    level_path = get_required_param(args, 'levelPath')
    include_player_start = get_optional_param(args, 'includePlayerStart', True)
    include_lighting = get_optional_param(args, 'includeLighting', True)

    full_path = f"{level_path}/{level_name}"
    spawned_actors = []

    # Create new level
    success = unreal.EditorLevelLibrary.new_level(full_path)
    if not success:
        return make_error(9021, f"Failed to create level '{level_name}' at '{level_path}'")

    if include_player_start:
        player_start = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.PlayerStart,
            unreal.Vector(0.0, 0.0, 100.0),
            unreal.Rotator(0.0, 0.0, 0.0)
        )
        if player_start:
            spawned_actors.append('PlayerStart')

    if include_lighting:
        # Directional light (sun)
        dir_light = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.DirectionalLight,
            unreal.Vector(0.0, 0.0, 300.0),
            unreal.Rotator(-45.0, 0.0, 0.0)
        )
        if dir_light:
            spawned_actors.append('DirectionalLight')

        # Sky light
        sky_light = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.SkyLight,
            unreal.Vector(0.0, 0.0, 300.0),
            unreal.Rotator(0.0, 0.0, 0.0)
        )
        if sky_light:
            spawned_actors.append('SkyLight')

    # Save level
    unreal.EditorLevelLibrary.save_current_level()

    return make_result({
        'levelName': level_name,
        'levelPath': level_path,
        'fullPath': full_path,
        'spawnedActors': spawned_actors,
    })
