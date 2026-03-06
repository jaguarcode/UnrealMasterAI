"""
anim.createMontage script.
Creates an AnimMontage from an existing AnimSequence.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    montage_name = get_required_param(params, "montageName")
    montage_path = get_required_param(params, "montagePath")
    sequence_path = get_required_param(params, "sequencePath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"AnimSequence not found: {sequence_path}")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.AnimMontageFactory()
    factory.set_editor_property("source_animation", sequence)

    montage = asset_tools.create_asset(montage_name, montage_path, None, factory)
    if montage is None:
        return make_error(5101, f"Failed to create AnimMontage '{montage_name}'")

    return make_result(
        montageName=montage_name,
        montagePath=montage_path,
        objectPath=str(montage.get_path_name()),
    )
