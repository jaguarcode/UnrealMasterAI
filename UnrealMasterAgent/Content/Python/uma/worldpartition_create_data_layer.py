"""
worldpartition-create-data-layer script.
Creates a new World Partition data layer in the current level.
Error codes: 8520-8529
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    layer_name = get_required_param(params, "layerName")
    layer_type = get_optional_param(params, "layerType", default="Editor")

    try:
        data_layer_subsystem = unreal.DataLayerEditorSubsystem.get()
        if data_layer_subsystem is None:
            return make_error(8520, "DataLayerEditorSubsystem is not available")

        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is None:
            return make_error(8521, "No editor world available")

        world_partition = world.get_world_partition()
        if world_partition is None:
            return make_error(8522, "World Partition is not enabled for this level")

        # Check for duplicate layer name
        existing_layers = data_layer_subsystem.get_all_data_layer_instances()
        for dl in existing_layers:
            if str(dl.get_data_layer_label()) == layer_name:
                return make_error(8523, f"Data layer '{layer_name}' already exists")

        new_layer = data_layer_subsystem.create_data_layer_instance(
            unreal.DataLayerCreationParameters(
                data_layer_label=layer_name,
            )
        )

        if new_layer is None:
            return make_error(8524, f"Failed to create data layer '{layer_name}'")

        return make_result(
            layerName=layer_name,
            layerType=layer_type,
            created=True,
        )

    except Exception as e:
        return make_error(8525, f"Failed to create data layer: {e}")
