"""
anim.listMontages script.
Lists all AnimMontage assets, optionally filtered by skeleton.
"""
import unreal
from uma.utils import execute_wrapper, make_result, get_optional_param


@execute_wrapper
def execute(params):
    skeleton_path = get_optional_param(params, "skeletonPath")

    ar = unreal.AssetRegistryHelpers.get_asset_registry()
    filter_obj = unreal.ARFilter(
        class_names=["AnimMontage"],
        recursive_classes=True,
    )
    assets = ar.get_assets(filter_obj)

    montages = []
    for asset in assets:
        path = str(asset.object_path)
        if skeleton_path:
            loaded = unreal.load_object(None, path)
            if loaded is None:
                continue
            skel = loaded.get_editor_property("skeleton")
            if skel is None or str(skel.get_path_name()) != skeleton_path:
                continue
        montages.append(path)

    return make_result(
        montages=montages,
        count=len(montages),
    )
