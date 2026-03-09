"""
audio.create_meta_sound script.
Create a MetaSoundSource asset (UE5+).
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_name = get_required_param(params, "assetName")
    asset_path = get_required_param(params, "assetPath")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

    # MetaSoundSource is the UE5 MetaSound asset class
    meta_sound_class = unreal.find_class("MetaSoundSource")
    if not meta_sound_class:
        return make_error(8240, "MetaSoundSource class not found. Ensure the MetaSound plugin is enabled.")

    factory_class = unreal.find_class("MetaSoundSourceFactory")
    if not factory_class:
        return make_error(8241, "MetaSoundSourceFactory not found. Ensure the MetaSound plugin is enabled.")

    factory = unreal.new_object(factory_class)
    meta_sound = asset_tools.create_asset(asset_name, asset_path, meta_sound_class, factory)

    if not meta_sound:
        return make_error(8242, f"Failed to create MetaSoundSource '{asset_name}' at '{asset_path}'")

    unreal.EditorAssetLibrary.save_asset(meta_sound.get_path_name())

    return make_result(
        assetPath=meta_sound.get_path_name(),
        assetName=asset_name,
    )
