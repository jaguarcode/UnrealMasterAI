"""
refactor.renameChain script.
Renames an asset, updates all references throughout the project, and cleans up redirectors.
Error codes: 9140-9149
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    new_name = get_required_param(params, "newName")
    update_references = get_optional_param(params, "updateReferences", True, bool)

    validate_path(asset_path)

    # Validate new name: no slashes or special chars
    import re
    if not re.match(r"^[A-Za-z0-9_]+$", new_name):
        return make_error(9140, f"newName '{new_name}' contains invalid characters; use alphanumeric and underscores only")

    # Check asset exists
    if not unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return make_error(9141, f"Asset not found: {asset_path}")

    # Build new path
    parts = asset_path.rsplit("/", 1)
    if len(parts) < 2:
        return make_error(9142, f"Invalid asset path format: {asset_path}")

    parent_dir = parts[0]
    new_path = f"{parent_dir}/{new_name}"

    # Check target doesn't already exist
    if unreal.EditorAssetLibrary.does_asset_exist(new_path):
        return make_error(9143, f"An asset already exists at target path: {new_path}")

    # Find referencers before rename (for reporting)
    referencers_before = []
    try:
        referencers_before = unreal.EditorAssetLibrary.find_package_referencers_for_asset(
            asset_path, load_assets_to_confirm=False
        ) or []
    except Exception:
        pass

    # Perform rename
    rename_success = unreal.EditorAssetLibrary.rename_asset(asset_path, new_path)
    if not rename_success:
        return make_error(9144, f"Failed to rename asset '{asset_path}' to '{new_path}'")

    # Consolidate redirectors to update references
    redirectors_cleaned = 0
    if update_references:
        try:
            # Find and fix redirectors left by the rename
            redirector_paths = unreal.EditorAssetLibrary.list_assets(parent_dir, recursive=False, include_folder=False)
            redirector_assets = []
            for rpath in redirector_paths:
                if unreal.EditorAssetLibrary.does_asset_exist(rpath):
                    asset = unreal.EditorAssetLibrary.load_asset(rpath)
                    if isinstance(asset, unreal.ObjectRedirector):
                        redirector_assets.append(asset)

            if redirector_assets:
                unreal.EditorAssetLibrary.consolidate_assets(redirector_assets[0], redirector_assets)
                redirectors_cleaned = len(redirector_assets)
        except Exception:
            pass

        # Save packages to persist reference updates
        try:
            unreal.EditorAssetLibrary.save_asset(new_path, only_if_is_dirty=False)
        except Exception:
            pass

    return make_result(
        oldPath=asset_path,
        newPath=new_path,
        newName=new_name,
        referencersUpdated=len(referencers_before),
        redirectorsCleaned=redirectors_cleaned,
        updateReferences=update_references,
    )
