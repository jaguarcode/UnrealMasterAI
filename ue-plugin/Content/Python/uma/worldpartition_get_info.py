"""
worldpartition-get-info script.
Reads World Partition configuration, data layers, and HLOD info for the current level.
Error codes: 8500-8599
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    level_path = get_optional_param(params, "levelPath")

    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is None:
            return make_error(8500, "No editor world available")

        world_partition = world.get_world_partition()
        if world_partition is None:
            return make_error(8501, "World Partition is not enabled for this level")

        # Gather basic WP config
        wp_info = {
            "enabled": True,
            "worldName": world.get_name(),
        }

        # Try to read cell size / grid config if available
        try:
            runtime_hash = world_partition.get_runtime_hash()
            if runtime_hash is not None:
                wp_info["runtimeHash"] = str(runtime_hash.get_class().get_name())
        except Exception:
            pass

        # Gather data layers
        data_layer_manager = unreal.DataLayerEditorSubsystem.get()
        data_layers = []
        if data_layer_manager is not None:
            try:
                for dl in data_layer_manager.get_all_data_layer_instances():
                    data_layers.append({
                        "name": dl.get_data_layer_label(),
                        "isVisible": dl.is_visible(),
                        "isLoaded": dl.is_effectively_loaded(),
                    })
            except Exception:
                pass

        # Gather HLOD layers
        hlod_layers = []
        try:
            hlod_layer_assets = unreal.AssetRegistry.get_assets_by_class("HLODLayer")
            for asset in hlod_layer_assets:
                hlod_layers.append({
                    "name": asset.asset_name,
                    "path": str(asset.object_path),
                })
        except Exception:
            pass

        return make_result(
            levelPath=level_path,
            worldPartition=wp_info,
            dataLayers=data_layers,
            hlodLayers=hlod_layers,
        )

    except Exception as e:
        return make_error(8502, f"Failed to get World Partition info: {e}")
