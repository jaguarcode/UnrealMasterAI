"""
analyze.assetHealth script.
Checks for unused assets, broken references, and oversized textures in a directory.
Error codes: 9110-9119
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game/", str)
    include_unused = get_optional_param(params, "includeUnused", True, bool)

    # Validate directory
    if ".." in directory:
        return make_error(9110, f"Path traversal not allowed: {directory}")

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    broken_references = []
    oversized_textures = []
    unused_assets = []
    total_checked = 0

    try:
        asset_datas = unreal.EditorAssetLibrary.list_assets(directory, recursive=True, include_folder=False)
    except Exception as e:
        return make_error(9111, f"Failed to list assets in '{directory}': {str(e)}")

    for asset_path in asset_datas:
        total_checked += 1

        # Check broken references
        try:
            deps = unreal.EditorAssetLibrary.find_package_referencers_for_asset(asset_path, load_assets_to_confirm=False)
        except Exception:
            deps = []

        try:
            asset_data = asset_registry.get_asset_by_object_path(asset_path)
            if not asset_data or not asset_data.is_valid():
                broken_references.append({
                    "assetPath": asset_path,
                    "reason": "asset_data invalid",
                })
        except Exception as e:
            broken_references.append({"assetPath": asset_path, "reason": str(e)})

        # Check oversized textures (> 4096 in either dimension)
        if "/Texture" in asset_path or asset_path.endswith("_T") or "Texture" in asset_path:
            try:
                texture = unreal.EditorAssetLibrary.load_asset(asset_path)
                if isinstance(texture, unreal.Texture2D):
                    width = texture.blueprint_get_size_x()
                    height = texture.blueprint_get_size_y()
                    if width > 4096 or height > 4096:
                        oversized_textures.append({
                            "assetPath": asset_path,
                            "width": width,
                            "height": height,
                        })
            except Exception:
                pass

        # Check unused assets (no referencers)
        if include_unused:
            try:
                referencers = unreal.EditorAssetLibrary.find_package_referencers_for_asset(
                    asset_path, load_assets_to_confirm=False
                )
                if not referencers:
                    unused_assets.append(asset_path)
            except Exception:
                pass

    health_score = 100
    if broken_references:
        health_score -= min(40, len(broken_references) * 5)
    if oversized_textures:
        health_score -= min(30, len(oversized_textures) * 10)
    if unused_assets:
        health_score -= min(20, len(unused_assets) * 2)

    return make_result(
        directory=directory,
        totalChecked=total_checked,
        healthScore=max(0, health_score),
        brokenReferences=broken_references,
        oversizedTextures=oversized_textures,
        unusedAssets=unused_assets if include_unused else None,
    )
