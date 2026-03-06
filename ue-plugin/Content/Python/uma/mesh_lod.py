"""
mesh.setLOD script.
Configures LOD screen size and reduction percentage for a static mesh LOD level.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    lod_index = get_required_param(params, "lodIndex", param_type=int)
    screen_size = get_optional_param(params, "screenSize", param_type=float)
    reduction_percent = get_optional_param(params, "reductionPercent", param_type=float)

    validate_path(mesh_path)

    if lod_index < 0:
        return make_error(5102, f"lodIndex must be >= 0, got {lod_index}")

    mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh is None:
        return make_error(5102, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh, unreal.StaticMesh):
        return make_error(5102, f"Asset is not a StaticMesh: {mesh_path}")

    lod_count = mesh.get_num_lods()
    if lod_index >= lod_count:
        return make_error(5102, f"LOD index {lod_index} out of range (mesh has {lod_count} LODs)")

    reduction_settings = mesh.get_editor_property("reduction_settings")
    if reduction_settings and lod_index < len(reduction_settings):
        lod_settings = reduction_settings[lod_index]
        if screen_size is not None:
            lod_settings.set_editor_property("screen_size", float(screen_size))
        if reduction_percent is not None:
            pct = max(0.0, min(100.0, float(reduction_percent)))
            lod_settings.set_editor_property("percent_triangles", (100.0 - pct) / 100.0)

    unreal.EditorAssetLibrary.save_asset(mesh_path)

    return make_result(
        meshPath=mesh_path,
        lodIndex=lod_index,
        screenSize=screen_size,
        reductionPercent=reduction_percent,
    )
