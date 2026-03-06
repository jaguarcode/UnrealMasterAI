"""
material.create script.
Creates a new material asset in the Unreal project using AssetTools.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    material_name = get_required_param(params, "materialName")
    material_path = get_required_param(params, "materialPath")
    material_type = get_optional_param(params, "materialType", default="Material")

    validate_path(material_path)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

    # Use MaterialFactoryNew for standard materials
    factory = unreal.MaterialFactoryNew()

    new_asset = asset_tools.create_asset(material_name, material_path, None, factory)

    if new_asset is None:
        return make_error(5101, f"Failed to create material '{material_name}' at '{material_path}'")

    return make_result(
        materialName=material_name,
        materialPath=material_path,
        materialType=material_type,
        objectPath=str(new_asset.get_path_name()),
    )
