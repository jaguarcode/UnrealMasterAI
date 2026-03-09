"""
curve.setKeys script.
Adds or modifies keyframes on a curve asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    curve_path = get_required_param(params, "curvePath")
    keys = get_required_param(params, "keys")
    validate_path(curve_path)

    if not isinstance(keys, list) or len(keys) == 0:
        return make_error(8710, "keys must be a non-empty array of {time, value} objects.")

    curve = unreal.EditorAssetLibrary.load_asset(curve_path)
    if curve is None:
        return make_error(8710, f"Curve not found: {curve_path}")

    if not isinstance(curve, unreal.CurveFloat):
        return make_error(8711, f"Asset is not a CurveFloat (only float curves support key editing): {curve_path}")

    rich_curve = curve.get_editor_property("float_curve")
    if rich_curve is None:
        return make_error(8712, f"Could not access float_curve on: {curve_path}")

    set_keys = []
    for key in keys:
        time = float(key.get("time", 0))
        value = float(key.get("value", 0))
        rich_curve.add_key(time, value)
        set_keys.append({"time": time, "value": value})

    unreal.EditorAssetLibrary.save_asset(curve_path)

    return make_result(
        curvePath=curve_path,
        keysSet=len(set_keys),
        keys=set_keys,
    )
