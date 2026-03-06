"""
geoscript.getInfo script.
Returns vertex count, triangle count, and bounding box for a mesh asset
using GeometryScriptLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    validate_path(mesh_path)

    mesh_asset = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh_asset is None:
        return make_error(8920, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh_asset, unreal.StaticMesh):
        return make_error(8921, f"Asset is not a StaticMesh: {mesh_path}")

    try:
        geo_lib = unreal.GeometryScriptLibrary
        dynamic = unreal.DynamicMesh()
        geo_lib.copy_mesh_from_static_mesh(mesh_asset, dynamic, unreal.GeometryScriptCopyMeshFromAssetOptions())

        vertex_count = geo_lib.get_vertex_count(dynamic)
        triangle_count = geo_lib.get_triangle_count(dynamic)
        bounds = geo_lib.get_mesh_bounding_box(dynamic)

        bounds_info = None
        if bounds is not None:
            bounds_info = {
                "min": {"x": bounds.min.x, "y": bounds.min.y, "z": bounds.min.z},
                "max": {"x": bounds.max.x, "y": bounds.max.y, "z": bounds.max.z},
            }
    except Exception as e:
        return make_error(8922, f"Failed to read mesh geometry info: {str(e)}")

    return make_result(
        meshPath=mesh_path,
        vertexCount=vertex_count,
        triangleCount=triangle_count,
        bounds=bounds_info,
    )
