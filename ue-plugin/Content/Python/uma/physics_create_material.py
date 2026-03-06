"""
physics.createMaterial - Create a PhysicalMaterial with friction and restitution settings.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "materialName")
    path = get_required_param(params, "materialPath")
    friction = get_optional_param(params, "friction", 0.7)
    restitution = get_optional_param(params, "restitution", 0.3)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.PhysicalMaterialFactoryNew()

    asset = asset_tools.create_asset(name, path, None, factory)
    if asset is None:
        return make_error(8420, f"Failed to create PhysicalMaterial '{name}'")

    phys_mat = unreal.PhysicalMaterial.cast(asset)
    if phys_mat is None:
        return make_error(8421, f"Created asset is not a PhysicalMaterial")

    phys_mat.set_editor_property("friction", float(friction))
    phys_mat.set_editor_property("restitution", float(restitution))

    full_path = str(asset.get_path_name())
    unreal.EditorAssetLibrary.save_asset(full_path)

    return make_result(
        materialName=name,
        materialPath=path,
        objectPath=full_path,
        friction=float(friction),
        restitution=float(restitution),
    )
