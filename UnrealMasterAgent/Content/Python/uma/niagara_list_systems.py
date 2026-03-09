"""
niagara.listSystems script.
Lists Niagara System assets using the Asset Registry.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game/")
    filter_str = get_optional_param(params, "filter", "")

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    ar_filter = unreal.ARFilter(
        class_names=["NiagaraSystem"],
        package_paths=[directory],
        recursive_paths=True,
    )

    asset_data_list = asset_registry.get_assets(ar_filter)

    systems = []
    for asset_data in asset_data_list:
        asset_name = str(asset_data.asset_name)
        if filter_str and filter_str.lower() not in asset_name.lower():
            continue
        systems.append({
            "assetName": asset_name,
            "packagePath": str(asset_data.package_path),
            "objectPath": str(asset_data.object_path),
        })

    return make_result(
        directory=directory,
        filter=filter_str,
        systems=systems,
        count=len(systems),
    )
