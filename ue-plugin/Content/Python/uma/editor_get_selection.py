"""
editor.getSelection script.
Gets currently selected actors and/or assets in the Unreal Editor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, get_optional_param


@execute_wrapper
def execute(params):
    asset_selection = get_optional_param(params, "assetSelection", False)

    subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actors = subsystem.get_selected_level_actors()
    actor_list = [
        {"name": str(a.get_actor_label()), "class": str(a.get_class().get_name())}
        for a in actors
    ]

    result = {"selectedActors": actor_list, "actorCount": len(actor_list)}

    if asset_selection:
        util_lib = unreal.EditorUtilityLibrary
        assets = util_lib.get_selected_assets()
        asset_list = [
            {
                "name": str(a.get_name()),
                "path": str(a.get_path_name()),
                "class": str(a.get_class().get_name()),
            }
            for a in assets
        ]
        result["selectedAssets"] = asset_list
        result["assetCount"] = len(asset_list)

    return make_result(**result)
