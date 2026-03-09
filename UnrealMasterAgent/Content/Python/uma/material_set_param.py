"""
material.setParameter script.
Sets a scalar, vector, or static switch parameter on a material or material instance.
"""
import json
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


def _parse_value(raw):
    """Parse value that may arrive as a JSON string from MCP."""
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            pass
    return raw


@execute_wrapper
def execute(params):
    material_path = get_required_param(params, "materialPath")
    parameter_name = get_required_param(params, "parameterName")
    value = _parse_value(params.get("value") or params.get("parameterValue"))
    parameter_type = get_optional_param(params, "parameterType", default="scalar")

    # Auto-detect vector type when value is a dict or list
    if isinstance(value, (dict, list, tuple)) and parameter_type == "scalar":
        parameter_type = "vector"

    validate_path(material_path)

    asset = unreal.load_asset(material_path)
    if asset is None:
        return make_error(5102, f"Material not found: {material_path}")

    if isinstance(asset, unreal.MaterialInstanceConstant):
        if parameter_type == "scalar":
            asset.set_editor_property("scalar_parameter_values", asset.scalar_parameter_values)
            unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(asset, parameter_name, float(value))
        elif parameter_type == "vector":
            color = unreal.LinearColor(*value) if isinstance(value, (list, tuple)) else unreal.LinearColor(value, value, value, 1.0)
            unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(asset, parameter_name, color)
        else:
            return make_error(5102, f"Unsupported parameter type for MaterialInstanceConstant: {parameter_type}")
    elif isinstance(asset, unreal.Material):
        mel = unreal.MaterialEditingLibrary
        if parameter_type.lower() in ("vector", "color", "basecolor"):
            color_node = mel.create_material_expression(asset, unreal.MaterialExpressionConstant3Vector, -300, 0)
            if color_node is None:
                return make_error(5101, "Failed to create Constant3Vector expression")
            if isinstance(value, dict):
                r, g, b = float(value.get("r", 0)), float(value.get("g", 0)), float(value.get("b", 0))
            elif isinstance(value, (list, tuple)):
                r, g, b = float(value[0]), float(value[1]), float(value[2])
            else:
                r, g, b = float(value), float(value), float(value)
            color_node.set_editor_property("constant", unreal.LinearColor(r, g, b, 1.0))
            prop_map = {
                "BaseColor": unreal.MaterialProperty.MP_BASE_COLOR,
                "EmissiveColor": unreal.MaterialProperty.MP_EMISSIVE_COLOR,
            }
            mat_prop = prop_map.get(parameter_name, unreal.MaterialProperty.MP_BASE_COLOR)
            mel.connect_material_property(color_node, "", mat_prop)
            mel.recompile_material(asset)
        elif parameter_type.lower() == "scalar":
            scalar_node = mel.create_material_expression(asset, unreal.MaterialExpressionConstant, -300, 0)
            if scalar_node is None:
                return make_error(5101, "Failed to create Constant expression")
            scalar_node.set_editor_property("r", float(value))
            prop_map = {
                "Metallic": unreal.MaterialProperty.MP_METALLIC,
                "Roughness": unreal.MaterialProperty.MP_ROUGHNESS,
                "Specular": unreal.MaterialProperty.MP_SPECULAR,
                "Opacity": unreal.MaterialProperty.MP_OPACITY,
            }
            mat_prop = prop_map.get(parameter_name, unreal.MaterialProperty.MP_METALLIC)
            mel.connect_material_property(scalar_node, "", mat_prop)
            mel.recompile_material(asset)
        else:
            return make_error(5102, f"Unsupported parameter type for base Material: {parameter_type}")
    else:
        return make_error(5102, f"Asset is not a material: {material_path}")

    unreal.EditorAssetLibrary.save_asset(material_path)

    return make_result(
        materialPath=material_path,
        parameterName=parameter_name,
        parameterType=parameter_type,
        value=value,
    )
