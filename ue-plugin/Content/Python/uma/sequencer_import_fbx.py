"""
sequencer.importFBX script.
Imports an FBX file into a Level Sequence.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")
    fbx_path = get_required_param(params, "fbxPath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5101, "Failed to get editor world for FBX import")

    import_options = unreal.MovieSceneUserImportFBXSettings()
    import_options.set_editor_property("reduce_keys", False)

    fbx_config = unreal.SequencerImportFBXParams()
    fbx_config.set_editor_property("world", world)
    fbx_config.set_editor_property("sequence", sequence)
    fbx_config.set_editor_property("bindings", [])
    fbx_config.set_editor_property("override_options", import_options)
    fbx_config.set_editor_property("fbx_file_name", fbx_path)

    success = unreal.SequencerTools.import_fbx(fbx_config)
    if not success:
        return make_error(5101, f"FBX import failed for sequence '{sequence_path}' from '{fbx_path}'")

    return make_result(
        sequencePath=sequence_path,
        fbxPath=fbx_path,
    )
