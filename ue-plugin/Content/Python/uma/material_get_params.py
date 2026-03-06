"""
material.getParameters script.
Retrieves all parameters of a material or material instance.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    material_path = get_required_param(params, "materialPath")

    validate_path(material_path)

    asset = unreal.load_asset(material_path)
    if asset is None:
        return make_error(5102, f"Material not found: {material_path}")

    scalar_params = []
    vector_params = []
    texture_params = []
    static_switch_params = []

    if isinstance(asset, (unreal.Material, unreal.MaterialInstanceConstant)):
        scalar_infos = unreal.MaterialEditingLibrary.get_scalar_parameter_names(asset)
        for name in scalar_infos:
            val, _ = unreal.MaterialEditingLibrary.get_material_default_scalar_parameter_value(asset, name)
            scalar_params.append({"name": str(name), "value": val})

        vector_infos = unreal.MaterialEditingLibrary.get_vector_parameter_names(asset)
        for name in vector_infos:
            val, _ = unreal.MaterialEditingLibrary.get_material_default_vector_parameter_value(asset, name)
            vector_params.append({"name": str(name), "value": [val.r, val.g, val.b, val.a]})

        texture_infos = unreal.MaterialEditingLibrary.get_texture_parameter_names(asset)
        for name in texture_infos:
            val, _ = unreal.MaterialEditingLibrary.get_material_default_texture_parameter_value(asset, name)
            texture_params.append({"name": str(name), "value": str(val.get_path_name()) if val else None})

        switch_infos = unreal.MaterialEditingLibrary.get_static_switch_parameter_names(asset)
        for name in switch_infos:
            val, _ = unreal.MaterialEditingLibrary.get_material_default_static_switch_parameter_value(asset, name)
            static_switch_params.append({"name": str(name), "value": val})
    else:
        return make_error(5102, f"Asset is not a material: {material_path}")

    return make_result(
        materialPath=material_path,
        scalarParameters=scalar_params,
        vectorParameters=vector_params,
        textureParameters=texture_params,
        staticSwitchParameters=static_switch_params,
    )
