"""
pcg.createGraph script.
Creates a new PCGGraph asset at the specified path using PCGGraphFactory.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    graph_name = get_required_param(params, "graphName")
    graph_path = get_required_param(params, "graphPath")
    validate_path(graph_path)

    full_path = f"{graph_path}/{graph_name}"

    # Check if asset already exists
    if unreal.EditorAssetLibrary.does_asset_exist(full_path):
        return make_error(8800, f"PCGGraph already exists: {full_path}")

    # Create the PCGGraph asset
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.PCGGraphFactory()
    if factory is None:
        return make_error(8801, "PCGGraphFactory not available - ensure PCG plugin is enabled")

    new_asset = asset_tools.create_asset(graph_name, graph_path, unreal.PCGGraph, factory)
    if new_asset is None:
        return make_error(8802, f"Failed to create PCGGraph: {full_path}")

    unreal.EditorAssetLibrary.save_asset(full_path)

    return make_result(
        graphPath=full_path,
        graphName=graph_name,
        created=True,
    )
