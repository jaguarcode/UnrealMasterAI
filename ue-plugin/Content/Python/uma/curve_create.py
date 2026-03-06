"""
curve.create script.
Creates a CurveFloat, CurveVector, or CurveLinearColor asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path

CURVE_TYPE_MAP = {
    "float": (unreal.CurveFloat, unreal.CurveFloatFactory),
    "vector": (unreal.CurveVector, unreal.CurveVectorFactory),
    "linear": (unreal.CurveLinearColor, unreal.CurveLinearColorFactory),
}


@execute_wrapper
def execute(params):
    curve_name = get_required_param(params, "curveName")
    curve_path = get_required_param(params, "curvePath")
    curve_type = get_optional_param(params, "curveType", default="float", param_type=str)

    validate_path(curve_path)

    if curve_type not in CURVE_TYPE_MAP:
        return make_error(8700, f"Invalid curveType '{curve_type}'. Must be 'float', 'vector', or 'linear'.")

    asset_class, factory_class = CURVE_TYPE_MAP[curve_type]
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    curve = asset_tools.create_asset(
        curve_name,
        curve_path,
        asset_class,
        factory_class(),
    )

    if curve is None:
        return make_error(8701, f"Failed to create curve at: {curve_path}/{curve_name}")

    unreal.EditorAssetLibrary.save_asset(f"{curve_path}/{curve_name}")

    return make_result(
        curveName=curve_name,
        curvePath=f"{curve_path}/{curve_name}",
        curveType=curve_type,
    )
