"""
texture.get_info script.
Read texture resolution, format, compression settings and LOD group.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    texture_path = get_required_param(params, "texturePath")

    asset = unreal.load_asset(texture_path)
    if asset is None:
        return make_error(8010, f"Texture not found at path '{texture_path}'")

    if not isinstance(asset, unreal.Texture2D):
        return make_error(8011, f"Asset at '{texture_path}' is not a Texture2D")

    compression = asset.get_editor_property("compression_settings")
    lod_group = asset.get_editor_property("lod_group")
    max_texture_size = asset.get_editor_property("max_texture_size")
    lod_bias = asset.get_editor_property("lod_bias")
    size_x = asset.blueprint_get_size_x()
    size_y = asset.blueprint_get_size_y()

    return make_result(
        texturePath=texture_path,
        width=size_x,
        height=size_y,
        compressionSettings=str(compression),
        lodGroup=str(lod_group),
        maxTextureSize=max_texture_size,
        lodBias=lod_bias,
    )
