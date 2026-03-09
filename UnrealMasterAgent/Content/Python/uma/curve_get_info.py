"""
curve.getInfo script.
Reads curve data including key count and range.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    curve_path = get_required_param(params, "curvePath")
    validate_path(curve_path)

    curve = unreal.EditorAssetLibrary.load_asset(curve_path)
    if curve is None:
        return make_error(8720, f"Curve not found: {curve_path}")

    curve_type = type(curve).__name__
    key_count = 0
    time_range = None
    value_range = None

    if isinstance(curve, unreal.CurveFloat):
        rich_curve = curve.get_editor_property("float_curve")
        if rich_curve:
            keys = rich_curve.get_keys()
            key_count = len(keys)
            if key_count > 0:
                times = [k.time for k in keys]
                values = [k.value for k in keys]
                time_range = {"min": min(times), "max": max(times)}
                value_range = {"min": min(values), "max": max(values)}
    elif isinstance(curve, unreal.CurveVector):
        curve_type = "CurveVector"
    elif isinstance(curve, unreal.CurveLinearColor):
        curve_type = "CurveLinearColor"

    return make_result(
        curvePath=curve_path,
        curveType=curve_type,
        keyCount=key_count,
        timeRange=time_range,
        valueRange=value_range,
    )
