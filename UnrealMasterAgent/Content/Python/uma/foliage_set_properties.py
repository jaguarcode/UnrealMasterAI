"""
foliage.setProperties script.
Sets density, scale, and cull distance on a foliage type.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    foliage_type_path = get_required_param(params, "foliageTypePath")
    validate_path(foliage_type_path)

    foliage_type = unreal.EditorAssetLibrary.load_asset(foliage_type_path)
    if foliage_type is None:
        return make_error(8620, f"FoliageType not found: {foliage_type_path}")

    if not isinstance(foliage_type, unreal.FoliageType):
        return make_error(8620, f"Asset is not a FoliageType: {foliage_type_path}")

    density = get_optional_param(params, "density", default=None, param_type=float)
    scale = get_optional_param(params, "scale", default=None, param_type=float)
    cull_distance = get_optional_param(params, "cullDistance", default=None, param_type=float)

    applied = {}

    if density is not None:
        foliage_type.set_editor_property("density", density)
        applied["density"] = density

    if scale is not None:
        scale_range = unreal.FloatInterval(scale, scale)
        foliage_type.set_editor_property("scale_x", scale_range)
        foliage_type.set_editor_property("scale_y", scale_range)
        foliage_type.set_editor_property("scale_z", scale_range)
        applied["scale"] = scale

    if cull_distance is not None:
        cull_range = unreal.Int32Interval(int(cull_distance), int(cull_distance))
        foliage_type.set_editor_property("cull_distance", cull_range)
        applied["cullDistance"] = cull_distance

    unreal.EditorAssetLibrary.save_asset(foliage_type_path)

    return make_result(
        foliageTypePath=foliage_type_path,
        applied=applied,
    )
