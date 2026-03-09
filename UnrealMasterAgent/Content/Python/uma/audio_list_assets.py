"""
audio.list_assets script.
List audio assets (SoundWave, SoundCue, MetaSoundSource) via AssetRegistry.
"""
import unreal
from uma.utils import execute_wrapper, make_result, get_optional_param

AUDIO_CLASS_NAMES = ["SoundWave", "SoundCue", "MetaSoundSource"]


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game")
    filter_str = get_optional_param(params, "filter", "")
    asset_type = get_optional_param(params, "assetType", "")

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    # Determine which class names to search
    if asset_type and asset_type in AUDIO_CLASS_NAMES:
        class_names = [asset_type]
    else:
        class_names = AUDIO_CLASS_NAMES

    all_assets = []
    for class_name in class_names:
        ar_filter = unreal.ARFilter(
            class_names=[class_name],
            package_paths=[directory],
            recursive_paths=True,
        )
        assets = asset_registry.get_assets(ar_filter)
        for asset in assets:
            asset_name = str(asset.asset_name)
            if filter_str and filter_str.lower() not in asset_name.lower():
                continue
            all_assets.append({
                "assetName": asset_name,
                "assetPath": str(asset.object_path),
                "assetClass": str(asset.asset_class),
                "packagePath": str(asset.package_path),
            })

    return make_result(
        assets=all_assets,
        count=len(all_assets),
        directory=directory,
    )
