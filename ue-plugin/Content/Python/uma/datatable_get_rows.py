"""
datatable.getRows script.
Retrieves all rows from a DataTable asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    table_path = get_required_param(params, "tablePath")

    table = unreal.load_object(None, table_path)
    if table is None:
        return make_error(5102, f"DataTable not found: {table_path}")

    row_names = unreal.DataTableFunctionLibrary.get_data_table_row_names(table)
    rows = []
    for name in row_names:
        rows.append(str(name))

    return make_result(
        tablePath=table_path,
        rowCount=len(rows),
        rows=rows,
    )
