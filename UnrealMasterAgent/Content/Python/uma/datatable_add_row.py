"""
datatable.addRow script.
Adds a row to an existing DataTable asset.
"""
import unreal
import json
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    table_path = get_required_param(params, "tablePath")
    row_name = get_required_param(params, "rowName")
    row_data = get_required_param(params, "rowData")

    table = unreal.load_object(None, table_path)
    if table is None:
        return make_error(5102, f"DataTable not found: {table_path}")

    # Build row from struct
    row_struct = table.get_editor_property("row_struct")
    if row_struct is None:
        return make_error(5103, "DataTable has no row struct")

    table.add_row(unreal.Name(row_name))
    unreal.EditorAssetLibrary.save_loaded_asset(table)

    return make_result(
        tablePath=table_path,
        rowName=row_name,
        added=True,
    )
