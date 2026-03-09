"""
worldpartition-create-hlod script.
Creates a Hierarchical Level of Detail (HLOD) layer config for World Partition.
Error codes: 8530-8539
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    layer_name = get_required_param(params, "layerName")
    hlod_setup_asset = get_optional_param(params, "hlodSetupAsset")

    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is None:
            return make_error(8530, "No editor world available")

        world_partition = world.get_world_partition()
        if world_partition is None:
            return make_error(8531, "World Partition is not enabled for this level")

        # Build asset path for the new HLOD layer asset
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        package_path = "/Game/WorldPartition/HLODLayers"
        asset_name = layer_name

        # Check if asset already exists
        existing = unreal.EditorAssetLibrary.does_asset_exist(f"{package_path}/{asset_name}")
        if existing:
            return make_error(8532, f"HLOD layer asset '{asset_name}' already exists at {package_path}")

        hlod_layer = asset_tools.create_asset(
            asset_name,
            package_path,
            unreal.HLODLayer,
            unreal.HLODLayerFactory(),
        )

        if hlod_layer is None:
            return make_error(8533, f"Failed to create HLOD layer asset '{layer_name}'")

        # If a setup asset path is provided, assign it
        if hlod_setup_asset:
            try:
                setup_asset = unreal.EditorAssetLibrary.load_asset(hlod_setup_asset)
                if setup_asset is not None:
                    hlod_layer.set_editor_property("HLODSetupAsset", setup_asset)
            except Exception as e:
                # Non-fatal: layer created but setup asset not applied
                unreal.EditorAssetLibrary.save_asset(f"{package_path}/{asset_name}")
                return make_result(
                    layerName=layer_name,
                    assetPath=f"{package_path}/{asset_name}",
                    hlodSetupAsset=None,
                    created=True,
                    warning=f"HLOD layer created but setup asset could not be applied: {e}",
                )

        unreal.EditorAssetLibrary.save_asset(f"{package_path}/{asset_name}")

        return make_result(
            layerName=layer_name,
            assetPath=f"{package_path}/{asset_name}",
            hlodSetupAsset=hlod_setup_asset,
            created=True,
        )

    except Exception as e:
        return make_error(8534, f"Failed to create HLOD layer: {e}")
