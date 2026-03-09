"""
apply_random_color_material.py
Assigns M_RandomColor material to the SpinningCube actor's StaticMeshComponent,
and compiles the BP_SpinningCube Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    steps = []

    # Load the material
    mat = unreal.load_asset("/Game/Materials/M_RandomColor")
    if not mat:
        return make_error(9300, "M_RandomColor material not found")

    # Find the SpinningCube actor in the level
    actor = None
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "SpinningCube":
            actor = a
            break

    if not actor:
        return make_error(9301, "SpinningCube actor not found in level")

    # Set material on StaticMeshComponent
    comps = actor.get_components_by_class(unreal.StaticMeshComponent)
    if comps:
        comps[0].set_material(0, mat)
        steps.append("Assigned M_RandomColor material to cube mesh")
    else:
        steps.append("Warning: No StaticMeshComponent found on actor")

    # Compile BP
    bp = unreal.load_asset("/Game/Blueprints/BP_SpinningCube")
    if bp:
        for lib in ["BlueprintEditorLibrary", "KismetSystemLibrary"]:
            if hasattr(unreal, lib):
                try:
                    getattr(unreal, lib).compile_blueprint(bp)
                    steps.append("Compiled BP_SpinningCube")
                    break
                except Exception:
                    pass
        eal.save_asset("/Game/Blueprints/BP_SpinningCube", False)
        steps.append("Saved Blueprint")

    # Save level
    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="M_RandomColor material applied. Press Play to see random color on the spinning cube!",
        steps=steps,
    )
