"""
project_dependencies.py - Returns asset reference graph using EditorAssetLibrary.
"""
import unreal
import json
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, 'assetPath', param_type=str)

    if '..' in asset_path:
        return make_error(5102, f'Path traversal not allowed: {asset_path}')

    asset_lib = unreal.EditorAssetLibrary

    # Verify asset exists
    if not asset_lib.does_asset_exist(asset_path):
        return make_error(5102, f'Asset does not exist: {asset_path}')

    # Get assets that reference this asset (referencers)
    referencers = []
    try:
        refs = asset_lib.find_package_referencers_for_asset(asset_path, load_assets_to_confirm=False)
        referencers = list(refs) if refs else []
    except Exception as e:
        referencers = []

    # Get assets this asset depends on (dependencies)
    dependencies = []
    try:
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
        package_name = asset_path.rsplit('.', 1)[0] if '.' in asset_path else asset_path
        dep_options = unreal.AssetRegistryDependencyOptions()
        dep_options.include_soft_package_references = True
        dep_options.include_hard_package_references = True
        dep_options.include_searchable_names = False
        dep_options.include_soft_management_references = False
        dep_options.include_hard_management_references = False
        deps = asset_registry.get_dependencies(package_name, dep_options)
        dependencies = [str(d) for d in deps] if deps else []
    except Exception as e:
        dependencies = []

    return make_result(
        asset_path=asset_path,
        referencers=referencers,
        dependencies=dependencies,
        referencer_count=len(referencers),
        dependency_count=len(dependencies),
    )
