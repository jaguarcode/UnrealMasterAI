"""
texture.set_compression script.
Set TextureCompressionSettings on a texture asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param

COMPRESSION_MAP = {
    "Default": unreal.TextureCompressionSettings.TC_DEFAULT,
    "Normalmap": unreal.TextureCompressionSettings.TC_NORMALMAP,
    "Masks": unreal.TextureCompressionSettings.TC_MASKS,
    "Grayscale": unreal.TextureCompressionSettings.TC_GRAYSCALE,
    "Displacementmap": unreal.TextureCompressionSettings.TC_DISPLACEMENTMAP,
    "VectorDisplacementmap": unreal.TextureCompressionSettings.TC_VECTOR_DISPLACEMENTMAP,
    "HDR": unreal.TextureCompressionSettings.TC_HDR,
    "EditorIcon": unreal.TextureCompressionSettings.TC_EDITOR_ICON,
    "Alpha": unreal.TextureCompressionSettings.TC_ALPHA,
    "DistanceFieldFont": unreal.TextureCompressionSettings.TC_DISTANCE_FIELD_FONT,
    "HDRCompressed": unreal.TextureCompressionSettings.TC_HDR_COMPRESSED,
    "BC7": unreal.TextureCompressionSettings.TC_BC7,
}


@execute_wrapper
def execute(params):
    texture_path = get_required_param(params, "texturePath")
    compression_type = get_required_param(params, "compressionType")

    asset = unreal.load_asset(texture_path)
    if asset is None:
        return make_error(8020, f"Texture not found at path '{texture_path}'")

    if not isinstance(asset, unreal.Texture):
        return make_error(8021, f"Asset at '{texture_path}' is not a Texture")

    if compression_type not in COMPRESSION_MAP:
        valid = list(COMPRESSION_MAP.keys())
        return make_error(8022, f"Unknown compressionType '{compression_type}'. Valid values: {valid}")

    asset.set_editor_property("compression_settings", COMPRESSION_MAP[compression_type])

    unreal.EditorAssetLibrary.save_asset(texture_path, only_if_is_dirty=False)

    return make_result(
        texturePath=texture_path,
        compressionType=compression_type,
    )
