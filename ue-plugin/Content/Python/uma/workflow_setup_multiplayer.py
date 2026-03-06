"""
Workflow: Setup Multiplayer
Error codes: 9050-9059
Scaffolds GameMode BP, PlayerState BP, and GameState BP for multiplayer.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9050)
def execute(args: dict) -> dict:
    game_name = get_required_param(args, 'gameName')
    base_path = get_required_param(args, 'basePath')
    max_players = get_optional_param(args, 'maxPlayers', 4)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    created_assets = []

    # GameMode Blueprint
    gm_factory = unreal.BlueprintFactory()
    gm_factory.set_editor_property('parent_class', unreal.GameModeBase)
    gm_name = f"GM_{game_name}"
    game_mode_bp = asset_tools.create_asset(gm_name, base_path, unreal.Blueprint, gm_factory)
    if game_mode_bp is None:
        return make_error(9051, f"Failed to create GameMode Blueprint '{gm_name}' at '{base_path}'")
    created_assets.append(f"{base_path}/{gm_name}")

    # PlayerState Blueprint
    ps_factory = unreal.BlueprintFactory()
    ps_factory.set_editor_property('parent_class', unreal.PlayerState)
    ps_name = f"PS_{game_name}"
    player_state_bp = asset_tools.create_asset(ps_name, base_path, unreal.Blueprint, ps_factory)
    if player_state_bp:
        created_assets.append(f"{base_path}/{ps_name}")

    # GameState Blueprint
    gs_factory = unreal.BlueprintFactory()
    gs_factory.set_editor_property('parent_class', unreal.GameStateBase)
    gs_name = f"GS_{game_name}"
    game_state_bp = asset_tools.create_asset(gs_name, base_path, unreal.Blueprint, gs_factory)
    if game_state_bp:
        created_assets.append(f"{base_path}/{gs_name}")

    # Save assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'gameName': game_name,
        'basePath': base_path,
        'maxPlayers': max_players,
        'createdAssets': created_assets,
    })
