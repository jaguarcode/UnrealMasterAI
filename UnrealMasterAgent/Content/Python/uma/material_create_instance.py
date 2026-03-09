"""
material.createInstance script.
Creates a MaterialInstanceConstant from a parent material.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    parent_path = get_required_param(params, "parentPath")
    instance_name = get_required_param(params, "instanceName")
    instance_path = get_required_param(params, "instancePath")

    validate_path(parent_path)
    validate_path(instance_path)

    parent = unreal.load_asset(parent_path)
    if parent is None:
        return make_error(5102, f"Parent material not found: {parent_path}")

    if not isinstance(parent, unreal.Material):
        return make_error(5102, f"Parent asset is not a Material: {parent_path}")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.MaterialInstanceConstantFactoryNew()
    factory.set_editor_property("initial_parent", parent)

    new_instance = asset_tools.create_asset(instance_name, instance_path, None, factory)

    if new_instance is None:
        return make_error(5101, f"Failed to create material instance '{instance_name}' at '{instance_path}'")

    return make_result(
        instanceName=instance_name,
        instancePath=instance_path,
        parentPath=parent_path,
        objectPath=str(new_instance.get_path_name()),
    )
