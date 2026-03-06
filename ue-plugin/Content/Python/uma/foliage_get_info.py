"""
foliage.getInfo script.
Reads foliage type settings including density, scale, and culling.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    foliage_type_path = get_required_param(params, "foliageTypePath")
    validate_path(foliage_type_path)

    foliage_type = unreal.EditorAssetLibrary.load_asset(foliage_type_path)
    if foliage_type is None:
        return make_error(8610, f"FoliageType not found: {foliage_type_path}")

    if not isinstance(foliage_type, unreal.FoliageType):
        return make_error(8610, f"Asset is not a FoliageType: {foliage_type_path}")

    density = foliage_type.get_editor_property("density")
    scaling = foliage_type.get_editor_property("scaling")
    scale_x = foliage_type.get_editor_property("scale_x")
    cull_distance = foliage_type.get_editor_property("cull_distance")

    mesh = foliage_type.get_editor_property("mesh") if hasattr(foliage_type, "mesh") else None
    mesh_path = mesh.get_path_name() if mesh else None

    return make_result(
        foliageTypePath=foliage_type_path,
        density=density,
        scaling=str(scaling),
        scaleX=str(scale_x) if scale_x else None,
        cullDistance=str(cull_distance) if cull_distance else None,
        meshPath=mesh_path,
    )
