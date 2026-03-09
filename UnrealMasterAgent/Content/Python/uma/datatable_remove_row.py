"""
datatable.removeRow script.
Removes a row from an existing DataTable asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    table_path = get_required_param(params, "tablePath")
    row_name = get_required_param(params, "rowName")

    table = unreal.load_object(None, table_path)
    if table is None:
        return make_error(5102, f"DataTable not found: {table_path}")

    table.remove_row(unreal.Name(row_name))
    unreal.EditorAssetLibrary.save_loaded_asset(table)

    return make_result(
        tablePath=table_path,
        rowName=row_name,
        removed=True,
    )
