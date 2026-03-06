"""
landscape.set_material script.
Assigns a material to a landscape actor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    landscape_name = get_required_param(params, "landscapeName")
    material_path = get_required_param(params, "materialPath")

    editor_world = unreal.EditorLevelLibrary.get_editor_world()
    if editor_world is None:
        return make_error(8340, "Could not get editor world")

    landscape = None
    for actor in unreal.GameplayStatics.get_all_actors_of_class(editor_world, unreal.Landscape):
        if actor.get_actor_label() == landscape_name:
            landscape = actor
            break

    if landscape is None:
        return make_error(8341, f"Landscape actor '{landscape_name}' not found")

    material = unreal.load_asset(material_path)
    if material is None:
        return make_error(8342, f"Material not found at path '{material_path}'")

    landscape.set_editor_property("landscape_material", material)
    unreal.EditorLevelLibrary.save_current_level()

    return make_result(
        landscapeName=landscape_name,
        materialPath=material_path,
        applied=True,
    )
