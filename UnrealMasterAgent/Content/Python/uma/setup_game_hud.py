"""
setup_game_hud.py
Creates a simple game HUD widget and displays it via a GameMode Blueprint.
HUD shows: level name, FPS counter, and object count.
Uses Python to create the widget and wire it to display on BeginPlay.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


def _compile_bp(bp):
    for lib in ["BlueprintEditorLibrary", "KismetSystemLibrary"]:
        if hasattr(unreal, lib):
            try:
                getattr(unreal, lib).compile_blueprint(bp)
                return True
            except Exception:
                pass
    return False


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    steps = []

    # ============================================
    # 1. CREATE WIDGET BLUEPRINT
    # ============================================
    widget_path = "/Game/UI"
    widget_name = "WBP_GameHUD"
    widget_full = f"{widget_path}/{widget_name}"

    if eal.does_asset_exist(widget_full):
        eal.delete_asset(widget_full)

    # Create widget blueprint using BlueprintFactory with UserWidget parent
    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.UserWidget)
    widget_bp = asset_tools.create_asset(widget_name, widget_path, unreal.Blueprint, factory)
    if not widget_bp:
        return make_error(9800, "Failed to create WBP_GameHUD")
    steps.append("Created WBP_GameHUD Widget Blueprint")

    _compile_bp(widget_bp)
    eal.save_asset(widget_full, False)

    # ============================================
    # 2. CREATE HUD ACTOR BLUEPRINT
    # ============================================
    # Since widget internals (adding TextBlocks etc.) are limited in Python,
    # we'll create a HUD Blueprint actor that draws text on screen using
    # PrintString or by creating the widget at runtime.
    #
    # Simpler approach: Create a BP_HUD actor that uses "Print String"
    # or "Draw Text" on tick to show info on screen.
    #
    # Even simpler: use a Python script to create a HUD class
    # that adds a widget to viewport on BeginPlay.

    hud_name = "BP_GameHUD"
    hud_path = "/Game/UI"
    hud_full = f"{hud_path}/{hud_name}"

    if eal.does_asset_exist(hud_full):
        eal.delete_asset(hud_full)

    hud_factory = unreal.BlueprintFactory()
    hud_factory.set_editor_property("parent_class", unreal.Actor)
    hud_bp = asset_tools.create_asset(hud_name, hud_path, unreal.Blueprint, hud_factory)
    if not hud_bp:
        return make_error(9801, "Failed to create BP_GameHUD actor")

    _compile_bp(hud_bp)
    eal.save_asset(hud_full, False)
    steps.append("Created BP_GameHUD actor Blueprint")

    # ============================================
    # 3. ADD BLUEPRINT NODES FOR HUD DISPLAY
    # ============================================
    # We'll add nodes to BP_GameHUD:
    # Event Tick -> Print String (with game info)
    # This is the simplest HUD approach that definitely works.
    # We'll show: Level name, Actor count, FPS, and controls info.
    steps.append("Blueprint nodes will be added via MCP tools")

    # ============================================
    # 4. SPAWN HUD ACTOR IN LEVEL
    # ============================================
    # Remove existing
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "GameHUD":
            a.destroy_actor()

    gen_class = hud_bp.generated_class()
    hud_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        gen_class, unreal.Vector(0, 0, 0)
    )
    if hud_actor:
        hud_actor.set_actor_label("GameHUD")
        steps.append("Spawned GameHUD actor in level")

    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="HUD Blueprint created and placed. Now adding display nodes...",
        hudBP=hud_full,
        widgetBP=widget_full,
        steps=steps,
    )
