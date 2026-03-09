"""
ai.getNavMeshInfo script.
Returns current RecastNavMesh configuration from the active world.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    recast_actors = unreal.GameplayStatics.get_all_actors_of_class(world, unreal.RecastNavMesh)
    if not recast_actors:
        return make_error(7611, "No RecastNavMesh actor found in the current world")

    nav_mesh = recast_actors[0]
    return make_result(
        agentRadius=nav_mesh.get_editor_property("agent_radius"),
        agentHeight=nav_mesh.get_editor_property("agent_height"),
        cellSize=nav_mesh.get_editor_property("cell_size"),
        objectPath=str(nav_mesh.get_path_name()),
    )
