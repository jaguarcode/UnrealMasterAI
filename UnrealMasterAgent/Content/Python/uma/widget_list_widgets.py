"""
widget.listWidgets script.
Lists Widget Blueprint assets in the content browser at a given path.
"""
import unreal
from uma.utils import execute_wrapper, make_result, get_optional_param


@execute_wrapper
def execute(params):
    path = get_optional_param(params, "path", default="/Game/", param_type=str)
    recursive = get_optional_param(params, "recursive", default=True, param_type=bool)

    asset_paths = unreal.EditorAssetLibrary.list_assets(path, recursive=recursive, include_folder=False)

    widgets = []
    for asset_path in asset_paths:
        asset_data = unreal.EditorAssetLibrary.find_asset_data(asset_path)
        if asset_data:
            class_path = str(asset_data.asset_class_path).lower()
            if "widgetblueprint" in class_path:
                widgets.append(str(asset_path))

    return make_result(widgets=widgets, count=len(widgets), path=path)
