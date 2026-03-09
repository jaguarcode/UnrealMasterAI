"""
editor.getViewport script.
Gets current viewport camera location, rotation, FOV, and dimensions.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    editor_viewport = unreal.EditorLevelLibrary.get_editor_world()
    if editor_viewport is None:
        return make_error(5101, "No editor world available")

    viewport_client = unreal.UnrealEditorSubsystem()
    subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

    location = subsystem.get_level_viewport_camera_info()[0]
    rotation = subsystem.get_level_viewport_camera_info()[1]
    fov = subsystem.get_level_viewport_camera_info()[2]

    return make_result(
        cameraLocation={"x": location.x, "y": location.y, "z": location.z},
        cameraRotation={"pitch": rotation.pitch, "yaw": rotation.yaw, "roll": rotation.roll},
        fieldOfView=fov,
    )
