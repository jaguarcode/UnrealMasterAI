"""
datatable.create script.
Creates a new DataTable asset in the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    table_name = get_required_param(params, "tableName")
    table_path = get_required_param(params, "tablePath")
    row_struct_path = get_required_param(params, "rowStructPath")

    row_struct = unreal.load_object(None, row_struct_path)
    if row_struct is None:
        return make_error(5102, f"Row struct not found: {row_struct_path}")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.DataTableFactory()
    factory.set_editor_property("struct", row_struct)

    new_table = asset_tools.create_asset(table_name, table_path, None, factory)
    if new_table is None:
        return make_error(5101, f"Failed to create DataTable '{table_name}' at '{table_path}'")

    return make_result(
        tableName=table_name,
        tablePath=table_path,
        objectPath=str(new_table.get_path_name()),
    )
