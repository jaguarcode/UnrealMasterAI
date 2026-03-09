"""
sequencer.create script.
Creates a new Level Sequence asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "sequenceName")
    path = get_required_param(params, "sequencePath")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.LevelSequenceFactoryNew()

    sequence = asset_tools.create_asset(name, path, None, factory)
    if sequence is None:
        return make_error(5101, f"Failed to create Level Sequence '{name}'")

    return make_result(
        sequenceName=name,
        sequencePath=path,
        objectPath=str(sequence.get_path_name()),
    )
