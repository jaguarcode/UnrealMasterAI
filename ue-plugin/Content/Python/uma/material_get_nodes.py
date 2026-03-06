"""
material.getNodes script.
Retrieves all expression nodes in a material graph.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    material_path = get_required_param(params, "materialPath")

    validate_path(material_path)

    material = unreal.load_asset(material_path)
    if material is None:
        return make_error(5102, f"Material not found: {material_path}")

    if not isinstance(material, unreal.Material):
        return make_error(5102, f"Asset is not a base Material (getNodes requires a Material, not an instance): {material_path}")

    expressions = unreal.MaterialEditingLibrary.get_expressions(material)

    nodes = []
    for expr in expressions:
        node_info = {
            "nodeType": expr.__class__.__name__,
            "objectPath": str(expr.get_path_name()),
        }
        # Include material expression desc if available
        try:
            desc = expr.get_editor_property("desc")
            if desc:
                node_info["description"] = str(desc)
        except Exception:
            pass
        nodes.append(node_info)

    return make_result(
        materialPath=material_path,
        nodeCount=len(nodes),
        nodes=nodes,
    )
