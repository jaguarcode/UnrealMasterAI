"""
geoscript.meshTransform script.
Performs simplify, remesh, or transform operations on a mesh
using GeometryScriptLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path

VALID_OPERATIONS = ("simplify", "remesh", "transform")


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    operation = get_required_param(params, "operation")
    extra_params = params.get("params", {}) or {}
    validate_path(mesh_path)

    if operation not in VALID_OPERATIONS:
        return make_error(8910, f"Invalid operation '{operation}'. Must be one of: {VALID_OPERATIONS}")

    mesh_asset = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh_asset is None:
        return make_error(8911, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh_asset, unreal.StaticMesh):
        return make_error(8912, f"Asset is not a StaticMesh: {mesh_path}")

    try:
        geo_lib = unreal.GeometryScriptLibrary
        dynamic = unreal.DynamicMesh()
        geo_lib.copy_mesh_from_static_mesh(mesh_asset, dynamic, unreal.GeometryScriptCopyMeshFromAssetOptions())

        if operation == "simplify":
            target_count = int(extra_params.get("targetTriangleCount", 500))
            opts = unreal.GeometryScriptSimplifyMeshOptions()
            geo_lib.apply_simplify_to_triangle_count(dynamic, target_count, opts)
        elif operation == "remesh":
            target_edge_length = float(extra_params.get("targetEdgeLength", 10.0))
            opts = unreal.GeometryScriptRemeshOptions()
            geo_lib.apply_remesh(dynamic, opts)
        elif operation == "transform":
            tx = float(extra_params.get("x", 0.0))
            ty = float(extra_params.get("y", 0.0))
            tz = float(extra_params.get("z", 0.0))
            transform = unreal.Transform(location=[tx, ty, tz])
            geo_lib.apply_transform(dynamic, transform, False)

        geo_lib.copy_mesh_to_static_mesh(dynamic, mesh_asset, unreal.GeometryScriptCopyMeshToAssetOptions())
        unreal.EditorAssetLibrary.save_asset(mesh_path)
    except Exception as e:
        return make_error(8913, f"Mesh transform operation failed: {str(e)}")

    return make_result(
        meshPath=mesh_path,
        operation=operation,
        params=extra_params,
        success=True,
    )
