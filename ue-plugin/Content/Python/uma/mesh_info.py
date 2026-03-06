"""
mesh.getInfo script.
Returns vertex count, triangle count, LOD count, and material slots for a static mesh.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    validate_path(mesh_path)

    mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh is None:
        return make_error(5102, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh, unreal.StaticMesh):
        return make_error(5102, f"Asset is not a StaticMesh: {mesh_path}")

    lod_count = mesh.get_num_lods()
    material_slots = []
    for i in range(mesh.get_num_sections(0)):
        mat = mesh.get_material(i)
        material_slots.append({
            "slotIndex": i,
            "materialPath": mat.get_path_name() if mat else None,
        })

    # Get render data stats from LOD 0
    render_data = mesh.render_data
    vertex_count = 0
    triangle_count = 0
    if render_data and lod_count > 0:
        lod_resource = render_data.lod_resources[0] if render_data.lod_resources else None
        if lod_resource:
            vertex_count = lod_resource.get_num_vertices()
            triangle_count = lod_resource.get_num_triangles()

    return make_result(
        meshPath=mesh_path,
        vertexCount=vertex_count,
        triangleCount=triangle_count,
        lodCount=lod_count,
        materialSlots=material_slots,
    )
