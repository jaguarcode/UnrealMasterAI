"""
worldpartition-set-config script.
Sets World Partition grid size and loading range for the current level.
Error codes: 8510-8519
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    grid_size = get_optional_param(params, "gridSize", param_type=(int, float))
    loading_range = get_optional_param(params, "loadingRange", param_type=(int, float))
    cell_size = get_optional_param(params, "cellSize", param_type=(int, float))

    if grid_size is None and loading_range is None and cell_size is None:
        return make_error(8510, "At least one of gridSize, loadingRange, or cellSize must be provided")

    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is None:
            return make_error(8511, "No editor world available")

        world_partition = world.get_world_partition()
        if world_partition is None:
            return make_error(8512, "World Partition is not enabled for this level")

        updated = {}

        if grid_size is not None:
            try:
                world_partition.set_editor_property("GridSize", int(grid_size))
                updated["gridSize"] = int(grid_size)
            except Exception as e:
                return make_error(8513, f"Failed to set gridSize: {e}")

        if loading_range is not None:
            try:
                world_partition.set_editor_property("LoadingRange", float(loading_range))
                updated["loadingRange"] = float(loading_range)
            except Exception as e:
                return make_error(8514, f"Failed to set loadingRange: {e}")

        if cell_size is not None:
            try:
                world_partition.set_editor_property("CellSize", int(cell_size))
                updated["cellSize"] = int(cell_size)
            except Exception as e:
                return make_error(8515, f"Failed to set cellSize: {e}")

        unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)

        return make_result(
            worldName=world.get_name(),
            updated=updated,
        )

    except Exception as e:
        return make_error(8516, f"Failed to set World Partition config: {e}")
