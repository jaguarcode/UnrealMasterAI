"""
content_details.py - Retrieves detailed property information for a specific asset.

Params:
  assetPath (str, required): Full content path to the asset (e.g., '/Game/BP_MyActor').
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath", param_type=str)
    validate_path(asset_path)

    asset_data = unreal.EditorAssetLibrary.find_asset_data(asset_path)
    if not asset_data or not asset_data.is_valid():
        return make_error(4040, f"Asset not found: {asset_path}")

    loaded = unreal.EditorAssetLibrary.load_asset(asset_path)
    if not loaded:
        return make_error(4041, f"Failed to load asset: {asset_path}")

    properties = {}
    try:
        for prop in loaded.get_class().get_editor_property_list():
            prop_name = str(prop.get_name())
            try:
                value = loaded.get_editor_property(prop_name)
                properties[prop_name] = str(value)
            except Exception:
                pass
    except Exception:
        pass

    return make_result(
        asset_path=asset_path,
        asset_name=str(asset_data.asset_name),
        asset_class=str(asset_data.asset_class_path),
        properties=properties,
    )
