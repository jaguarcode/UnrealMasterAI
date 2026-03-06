"""
foliage.createType script.
Creates a FoliageType asset with an assigned static mesh.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    type_name = get_required_param(params, "typeName")
    type_path = get_required_param(params, "typePath")
    mesh_path = get_required_param(params, "meshPath")

    validate_path(type_path)
    validate_path(mesh_path)

    mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh is None:
        return make_error(8600, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh, unreal.StaticMesh):
        return make_error(8600, f"Asset is not a StaticMesh: {mesh_path}")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    foliage_type = asset_tools.create_asset(
        type_name,
        type_path,
        unreal.FoliageType_InstancedStaticMesh,
        unreal.FoliageTypeFactory(),
    )

    if foliage_type is None:
        return make_error(8601, f"Failed to create FoliageType at: {type_path}/{type_name}")

    foliage_type.set_editor_property("mesh", mesh)
    unreal.EditorAssetLibrary.save_asset(f"{type_path}/{type_name}")

    return make_result(
        typeName=type_name,
        typePath=f"{type_path}/{type_name}",
        meshPath=mesh_path,
    )
