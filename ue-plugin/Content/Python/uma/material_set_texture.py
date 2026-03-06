"""
material.setTexture script.
Assigns a texture asset to a texture parameter on a material instance.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    material_path = get_required_param(params, "materialPath")
    parameter_name = get_required_param(params, "parameterName")
    texture_path = get_required_param(params, "texturePath")

    validate_path(material_path)
    validate_path(texture_path)

    material = unreal.load_asset(material_path)
    if material is None:
        return make_error(5102, f"Material not found: {material_path}")

    texture = unreal.load_asset(texture_path)
    if texture is None:
        return make_error(5102, f"Texture not found: {texture_path}")

    if not isinstance(texture, unreal.Texture):
        return make_error(5102, f"Asset is not a Texture: {texture_path}")

    if isinstance(material, unreal.MaterialInstanceConstant):
        unreal.MaterialEditingLibrary.set_material_instance_texture_parameter_value(material, parameter_name, texture)
        unreal.EditorAssetLibrary.save_asset(material_path)
    elif isinstance(material, unreal.Material):
        return make_error(5102, "Texture parameters must be set on a MaterialInstance, not a base Material")
    else:
        return make_error(5102, f"Asset is not a material: {material_path}")

    return make_result(
        materialPath=material_path,
        parameterName=parameter_name,
        texturePath=texture_path,
    )
