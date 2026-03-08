"""
fix_random_color_material.py
Cleans up and rebuilds M_RandomColor material with only the needed nodes:
- 1 VectorParameter "BaseColor" -> BaseColor + Multiply(x5) -> EmissiveColor
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
    try:
        num_expr = mel.get_num_material_expressions(mat)
        if num_expr > 0:
            mel.delete_all_material_expressions(mat)
            steps.append(f"Deleted {num_expr} old expression nodes")
    except Exception as e:
        steps.append(f"Cleanup: {e}")

    # Create fresh VectorParameter "BaseColor"
    vec_param = mel.create_material_expression(
        mat, unreal.MaterialExpressionVectorParameter, -400, 0
    )
    vec_param.set_editor_property("parameter_name", "BaseColor")
    vec_param.set_editor_property("default_value", unreal.LinearColor(1, 1, 1, 1))
    steps.append("Created BaseColor VectorParameter")

    # Create Multiply node (x5 for bright emissive)
    multiply_node = mel.create_material_expression(
        mat, unreal.MaterialExpressionMultiply, -200, 200
    )
    multiply_node.set_editor_property("const_b", 5.0)
    steps.append("Created Multiply node (x5)")

    # Wire: VectorParam -> BaseColor property
    mel.connect_material_property(vec_param, "", unreal.MaterialProperty.MP_BASE_COLOR)
    steps.append("Connected VectorParam -> BaseColor")

    # Wire: VectorParam -> Multiply.A -> EmissiveColor property
    mel.connect_material_expressions(vec_param, "", multiply_node, "A")
    mel.connect_material_property(multiply_node, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    steps.append("Connected VectorParam -> Multiply -> EmissiveColor")

    # Recompile and save
    mel.recompile_material(mat)
    eal.save_asset(mat_path, False)
    steps.append("Recompiled and saved (3 nodes total)")

    return make_result(
        message="M_RandomColor cleaned up — only 3 expression nodes remain.",
        steps=steps,
    )
