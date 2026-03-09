"""
compile_game_hud.py
Compiles and saves BP_GameHUD Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    steps = []

    bp = unreal.load_asset("/Game/UI/BP_GameHUD")
    if not bp:
        return make_error(9900, "BP_GameHUD not found")

    # Compile
    if hasattr(unreal, "BlueprintEditorLibrary"):
        unreal.BlueprintEditorLibrary.compile_blueprint(bp)
        steps.append("Compiled BP_GameHUD")
    elif hasattr(unreal, "KismetSystemLibrary"):
        unreal.KismetSystemLibrary.compile_blueprint(bp)
        steps.append("Compiled BP_GameHUD (KismetSystemLibrary)")

    eal.save_asset("/Game/UI/BP_GameHUD", False)
    steps.append("Saved BP_GameHUD")

    # Also save the level
    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="BP_GameHUD compiled and saved!",
        steps=steps,
    )
