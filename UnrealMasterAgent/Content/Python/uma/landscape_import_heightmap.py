"""
landscape.import_heightmap script.
Imports a heightmap to an existing landscape actor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    landscape_name = get_required_param(params, "landscapeName")
    heightmap_path = get_required_param(params, "heightmapPath")

    subsystem = unreal.get_editor_subsystem(unreal.LandscapeEditorSubsystem)
    if subsystem is None:
        return make_error(8310, "LandscapeEditorSubsystem not available")

    # Find the landscape actor by name
    editor_world = unreal.EditorLevelLibrary.get_editor_world()
    if editor_world is None:
        return make_error(8311, "Could not get editor world")

    landscape = None
    for actor in unreal.GameplayStatics.get_all_actors_of_class(editor_world, unreal.Landscape):
        if actor.get_actor_label() == landscape_name:
            landscape = actor
            break

    if landscape is None:
        return make_error(8312, f"Landscape actor '{landscape_name}' not found")

    result = subsystem.import_heightmap(heightmap_path)
    if not result:
        return make_error(8313, f"Failed to import heightmap from '{heightmap_path}'")

    return make_result(
        landscapeName=landscape_name,
        heightmapPath=heightmap_path,
        imported=True,
    )
