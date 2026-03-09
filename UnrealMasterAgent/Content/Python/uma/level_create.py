"""
level-create script.
Creates a new level in the Unreal project using EditorLevelLibrary.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    level_name = get_required_param(params, "levelName")
    template_path = get_optional_param(params, "templatePath")

    if template_path:
        success = unreal.EditorLevelLibrary.new_level_from_template(level_name, template_path)
    else:
        success = unreal.EditorLevelLibrary.new_level(level_name)

    if not success:
        return make_error(5101, f"Failed to create level '{level_name}'")

    return make_result(
        levelName=level_name,
        templatePath=template_path,
        created=True,
    )
