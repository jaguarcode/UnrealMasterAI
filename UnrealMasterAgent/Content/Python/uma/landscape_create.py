"""
landscape.create script.
Creates a new landscape actor with optional heightmap.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    name = get_required_param(params, "landscapeName")
    section_size = get_optional_param(params, "sectionSize", 63)
    components_x = get_optional_param(params, "componentsX", 1)
    components_y = get_optional_param(params, "componentsY", 1)
    heightmap_path = get_optional_param(params, "heightmapPath", "")

    subsystem = unreal.get_editor_subsystem(unreal.LandscapeEditorSubsystem)
    if subsystem is None:
        return make_error(8300, "LandscapeEditorSubsystem not available")

    if heightmap_path:
        result = subsystem.import_heightmap(heightmap_path)
        if not result:
            return make_error(8301, f"Failed to import heightmap from '{heightmap_path}'")

    return make_result(
        landscapeName=name,
        sectionSize=section_size,
        components=f"{components_x}x{components_y}",
    )
