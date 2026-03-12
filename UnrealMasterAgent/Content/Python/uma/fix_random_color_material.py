"""
fix_random_color_material.py
Cleans up and rebuilds M_RandomColor material.
Matte look: high roughness, subtle emissive, no specular shine.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    mel = unreal.MaterialEditingLibrary
    steps = []

    mat_path = "/Game/Materials/M_RandomColor"
    mat = unreal.load_asset(mat_path)
    if not mat:
        return make_error(9400, "M_RandomColor not found")

    # Delete ALL existing expressions to start clean
    num_expr = mel.get_num_material_expressions(mat)
    if num_expr > 0:
        mel.delete_all_material_expressions(mat)
        steps.append(f"Deleted {num_expr} old expression nodes")

    # VectorParameter "BaseColor"
    vec_param = mel.create_material_expression(
        mat, unreal.MaterialExpressionVectorParameter, -400, 0
    )
    vec_param.set_editor_property("parameter_name", "BaseColor")
    vec_param.set_editor_property("default_value", unreal.LinearColor(1, 1, 1, 1))

    # Constant for roughness (0.9 = very matte)
    roughness_const = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 200
    )
    roughness_const.set_editor_property("r", 0.9)

    # Constant for specular (0.05 = almost no specular)
    specular_const = mel.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 300
    )
    specular_const.set_editor_property("r", 0.05)

    # Subtle emissive multiply (0.3x instead of 5x)
    multiply_node = mel.create_material_expression(
        mat, unreal.MaterialExpressionMultiply, -200, 100
    )
    multiply_node.set_editor_property("const_b", 0.3)

    steps.append("Created 4 expression nodes (VectorParam, Roughness, Specular, Multiply)")

    # Wire connections
    mel.connect_material_property(vec_param, "", unreal.MaterialProperty.MP_BASE_COLOR)
    mel.connect_material_expressions(vec_param, "", multiply_node, "A")
    mel.connect_material_property(multiply_node, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    mel.connect_material_property(roughness_const, "", unreal.MaterialProperty.MP_ROUGHNESS)
    mel.connect_material_property(specular_const, "", unreal.MaterialProperty.MP_SPECULAR)
    steps.append("Connected: BaseColor, Emissive(x0.3), Roughness(0.9), Specular(0.05)")

    # Recompile and save
    mel.recompile_material(mat)
    eal.save_asset(mat_path, False)
    steps.append("Recompiled and saved")

    return make_result(
        message="M_RandomColor is now matte: high roughness, low specular, subtle emissive.",
        steps=steps,
    )
