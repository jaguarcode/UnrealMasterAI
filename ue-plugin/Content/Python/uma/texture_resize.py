"""
texture.resize script.
Set MaxTextureSize and LOD bias on a texture asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param

VALID_MAX_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]


@execute_wrapper
def execute(params):
    texture_path = get_required_param(params, "texturePath")
    max_size = get_required_param(params, "maxSize")
    lod_bias = get_optional_param(params, "lodBias", None)

    asset = unreal.load_asset(texture_path)
    if asset is None:
        return make_error(8040, f"Texture not found at path '{texture_path}'")

    if not isinstance(asset, unreal.Texture):
        return make_error(8041, f"Asset at '{texture_path}' is not a Texture")

    max_size_int = int(max_size)
    if max_size_int not in VALID_MAX_SIZES:
        return make_error(8042, f"maxSize must be a power of 2 between 1 and 8192. Got: {max_size_int}")

    asset.set_editor_property("max_texture_size", max_size_int)

    if lod_bias is not None:
        asset.set_editor_property("lod_bias", int(lod_bias))

    unreal.EditorAssetLibrary.save_asset(texture_path, only_if_is_dirty=False)

    return make_result(
        texturePath=texture_path,
        maxSize=max_size_int,
        lodBias=int(lod_bias) if lod_bias is not None else 0,
    )
