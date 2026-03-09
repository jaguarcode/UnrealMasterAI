"""
physics.createAsset - Create a PhysicsAsset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "assetName")
    path = get_required_param(params, "assetPath")
    skeletal_mesh = get_optional_param(params, "skeletalMeshPath", "")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.PhysicsAssetFactory()

    if skeletal_mesh:
        mesh = unreal.EditorAssetLibrary.load_asset(skeletal_mesh)
        if mesh:
            factory.set_editor_property("target_skeletal_mesh", mesh)

    asset = asset_tools.create_asset(name, path, None, factory)
    if asset is None:
        return make_error(8400, f"Failed to create PhysicsAsset '{name}'")

    return make_result(
        assetName=name,
        assetPath=path,
        objectPath=str(asset.get_path_name()),
    )
