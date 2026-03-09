"""
geoscript.meshBoolean script.
Performs boolean operations (union/subtract/intersect) on two meshes
using GeometryScriptLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path

VALID_OPERATIONS = ("union", "subtract", "intersect")


@execute_wrapper
def execute(params):
    target_mesh_path = get_required_param(params, "targetMesh")
    tool_mesh_path = get_required_param(params, "toolMesh")
    operation = get_required_param(params, "operation")
    validate_path(target_mesh_path)
    validate_path(tool_mesh_path)

    if operation not in VALID_OPERATIONS:
        return make_error(8900, f"Invalid operation '{operation}'. Must be one of: {VALID_OPERATIONS}")

    target_asset = unreal.EditorAssetLibrary.load_asset(target_mesh_path)
    if target_asset is None:
        return make_error(8901, f"Target mesh not found: {target_mesh_path}")

    tool_asset = unreal.EditorAssetLibrary.load_asset(tool_mesh_path)
    if tool_asset is None:
        return make_error(8902, f"Tool mesh not found: {tool_mesh_path}")

    if not isinstance(target_asset, unreal.StaticMesh):
        return make_error(8903, f"Target asset is not a StaticMesh: {target_mesh_path}")
    if not isinstance(tool_asset, unreal.StaticMesh):
        return make_error(8904, f"Tool asset is not a StaticMesh: {tool_mesh_path}")

    try:
        geo_lib = unreal.GeometryScriptLibrary
        target_dynamic = unreal.DynamicMesh()
        tool_dynamic = unreal.DynamicMesh()

        geo_lib.copy_mesh_from_static_mesh(target_asset, target_dynamic, unreal.GeometryScriptCopyMeshFromAssetOptions())
        geo_lib.copy_mesh_from_static_mesh(tool_asset, tool_dynamic, unreal.GeometryScriptCopyMeshFromAssetOptions())

        op_map = {
            "union": unreal.GeometryScriptBooleanOperation.UNION,
            "subtract": unreal.GeometryScriptBooleanOperation.SUBTRACT,
            "intersect": unreal.GeometryScriptBooleanOperation.INTERSECT,
        }
        result_mesh = unreal.DynamicMesh()
        geo_lib.apply_mesh_boolean(target_dynamic, tool_dynamic, result_mesh, op_map[operation], unreal.GeometryScriptMeshBooleanOptions())
        geo_lib.copy_mesh_to_static_mesh(result_mesh, target_asset, unreal.GeometryScriptCopyMeshToAssetOptions())
        unreal.EditorAssetLibrary.save_asset(target_mesh_path)
    except Exception as e:
        return make_error(8905, f"Boolean operation failed: {str(e)}")

    return make_result(
        targetMesh=target_mesh_path,
        toolMesh=tool_mesh_path,
        operation=operation,
        success=True,
    )
