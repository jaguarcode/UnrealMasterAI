"""
debug.getPerformance script.
Retrieves current editor performance metrics.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    # Gather performance stats via Unreal Python API
    fps = unreal.MathLibrary.round(1.0 / max(unreal.SystemLibrary.get_engine_version() and 0.016 or 0.016, 0.0001))

    # Use engine stats if available
    stats = {}

    try:
        viewport_client = unreal.EditorLevelLibrary.get_editor_world()
        if viewport_client:
            stats["worldName"] = viewport_client.get_name()
            stats["levelCount"] = len(unreal.EditorLevelUtils.get_levels(viewport_client))
    except Exception:
        pass

    try:
        # Actor count
        all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
        stats["actorCount"] = len(all_actors)
    except Exception:
        stats["actorCount"] = None

    # System memory info
    try:
        mem_stats = unreal.SystemLibrary.get_platform_memory_stats()
        if mem_stats:
            stats["availablePhysicalMemoryMB"] = mem_stats.available_physical / (1024 * 1024)
            stats["totalPhysicalMemoryMB"] = mem_stats.total_physical / (1024 * 1024)
    except Exception:
        pass

    return make_result(performance=stats)
