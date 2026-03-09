"""
content_find.py - Searches for assets in the Content Browser by query string.

Params:
  query (str, required): Search term to match against asset names.
  assetType (str, optional): Filter by asset class name.
  path (str, optional): Restrict search to this content path. Defaults to '/Game/'.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    query = get_required_param(params, "query", param_type=str)
    asset_type = get_optional_param(params, "assetType", default=None, param_type=str)
    path = get_optional_param(params, "path", default="/Game/", param_type=str)

    registry = unreal.AssetRegistryHelpers.get_asset_registry()

    ar_filter = unreal.ARFilter(
        package_paths=[path],
        recursive_paths=True,
    )
    if asset_type:
        ar_filter.class_names = [asset_type]

    all_assets = registry.get_assets(ar_filter)

    results = []
    query_lower = query.lower()
    for asset_data in all_assets:
        name = str(asset_data.asset_name)
        if query_lower in name.lower():
            results.append({
                "name": name,
                "path": str(asset_data.object_path),
                "class": str(asset_data.asset_class_path),
            })

    return make_result(assets=results, count=len(results), query=query)
