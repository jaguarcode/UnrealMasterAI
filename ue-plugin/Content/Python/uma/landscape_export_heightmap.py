"""
landscape.export_heightmap script.
Exports the heightmap from a landscape actor to a file.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    landscape_name = get_required_param(params, "landscapeName")
    export_path = get_required_param(params, "exportPath")

    subsystem = unreal.get_editor_subsystem(unreal.LandscapeEditorSubsystem)
    if subsystem is None:
        return make_error(8320, "LandscapeEditorSubsystem not available")

    editor_world = unreal.EditorLevelLibrary.get_editor_world()
    if editor_world is None:
        return make_error(8321, "Could not get editor world")

    landscape = None
    for actor in unreal.GameplayStatics.get_all_actors_of_class(editor_world, unreal.Landscape):
        if actor.get_actor_label() == landscape_name:
            landscape = actor
            break

    if landscape is None:
        return make_error(8322, f"Landscape actor '{landscape_name}' not found")

    result = subsystem.export_heightmap(export_path)
    if not result:
        return make_error(8323, f"Failed to export heightmap to '{export_path}'")

    return make_result(
        landscapeName=landscape_name,
        exportPath=export_path,
        exported=True,
    )
