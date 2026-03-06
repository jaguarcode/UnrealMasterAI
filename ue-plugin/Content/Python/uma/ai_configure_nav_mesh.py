"""
ai.configureNavMesh script.
Configures the RecastNavMesh settings in the current world.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    agent_radius = get_optional_param(params, "agentRadius")
    agent_height = get_optional_param(params, "agentHeight")
    cell_size = get_optional_param(params, "cellSize")

    nav_system = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_world_settings()
    # Locate the RecastNavMesh actor in the world
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    recast_actors = unreal.GameplayStatics.get_all_actors_of_class(world, unreal.RecastNavMesh)
    if not recast_actors:
        return make_error(7610, "No RecastNavMesh actor found in the current world")

    nav_mesh = recast_actors[0]
    applied = {}

    if agent_radius is not None:
        nav_mesh.set_editor_property("agent_radius", float(agent_radius))
        applied["agentRadius"] = agent_radius
    if agent_height is not None:
        nav_mesh.set_editor_property("agent_height", float(agent_height))
        applied["agentHeight"] = agent_height
    if cell_size is not None:
        nav_mesh.set_editor_property("cell_size", float(cell_size))
        applied["cellSize"] = cell_size

    nav_mesh.modify()
    return make_result(applied=applied)
