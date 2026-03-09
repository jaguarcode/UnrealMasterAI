"""
sequencer.exportFBX script.
Exports a Level Sequence to an FBX file using SequencerTools.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")
    output_path = get_required_param(params, "outputPath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        return make_error(5101, "Failed to get editor world for FBX export")

    export_options = unreal.FbxExportOption()
    fbx_config = unreal.SequencerExportFBXParams()
    fbx_config.set_editor_property("world", world)
    fbx_config.set_editor_property("sequence", sequence)
    fbx_config.set_editor_property("bindings", [])
    fbx_config.set_editor_property("override_options", export_options)
    fbx_config.set_editor_property("fbx_file_name", output_path)

    success = unreal.SequencerTools.export_fbx(fbx_config)
    if not success:
        return make_error(5101, f"FBX export failed for sequence '{sequence_path}'")

    return make_result(
        sequencePath=sequence_path,
        outputPath=output_path,
    )
