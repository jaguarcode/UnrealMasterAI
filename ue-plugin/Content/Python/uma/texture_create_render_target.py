"""
texture.create_render_target script.
Create a RenderTarget2D asset in the project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param

FORMAT_MAP = {
    "R8G8B8A8": unreal.TextureRenderTargetFormat.RTF_RGBA8,
    "RGBA16f": unreal.TextureRenderTargetFormat.RTF_RGBA16F,
    "RGBA32f": unreal.TextureRenderTargetFormat.RTF_RGBA32F,
    "R16f": unreal.TextureRenderTargetFormat.RTF_R16F,
    "R32f": unreal.TextureRenderTargetFormat.RTF_R32F,
    "RG8": unreal.TextureRenderTargetFormat.RTF_RG8,
    "RG16f": unreal.TextureRenderTargetFormat.RTF_RG16F,
}


@execute_wrapper
def execute(params):
    asset_name = get_required_param(params, "assetName")
    asset_path = get_required_param(params, "assetPath")
    width = get_required_param(params, "width")
    height = get_required_param(params, "height")
    format_str = get_optional_param(params, "format", "RGBA16f")

    if format_str not in FORMAT_MAP:
        valid = list(FORMAT_MAP.keys())
        return make_error(8030, f"Unknown format '{format_str}'. Valid values: {valid}")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    rt = asset_tools.create_asset(
        asset_name,
        asset_path,
        unreal.TextureRenderTarget2D,
        unreal.TextureRenderTarget2DFactoryNew(),
    )

    if rt is None:
        return make_error(8031, f"Failed to create RenderTarget2D '{asset_name}' at '{asset_path}'")

    rt.set_editor_property("render_target_format", FORMAT_MAP[format_str])
    rt.set_editor_property("size_x", int(width))
    rt.set_editor_property("size_y", int(height))

    full_path = f"{asset_path}/{asset_name}"
    unreal.EditorAssetLibrary.save_asset(full_path, only_if_is_dirty=False)

    return make_result(
        assetPath=full_path,
        assetName=asset_name,
        width=int(width),
        height=int(height),
        format=format_str,
    )
