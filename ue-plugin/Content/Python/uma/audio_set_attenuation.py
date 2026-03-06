"""
audio.set_attenuation script.
Configure distance attenuation settings on a SoundAttenuation asset or SoundWave.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    audio_path = get_required_param(params, "audioPath")
    inner_radius = get_optional_param(params, "innerRadius", None)
    outer_radius = get_optional_param(params, "outerRadius", None)
    falloff_distance = get_optional_param(params, "falloffDistance", None)

    asset = unreal.load_asset(audio_path)
    if not asset:
        return make_error(8230, f"Audio asset not found at '{audio_path}'")

    if isinstance(asset, unreal.SoundAttenuation):
        attenuation_settings = asset.get_editor_property("attenuation")
    elif isinstance(asset, (unreal.SoundBase, unreal.SoundWave, unreal.SoundCue)):
        attenuation_settings = asset.get_editor_property("attenuation_settings")
        if not attenuation_settings:
            return make_error(8231, f"No attenuation settings found on '{audio_path}'. Assign a SoundAttenuation asset first.")
        attenuation_settings = attenuation_settings.get_editor_property("attenuation")
    else:
        return make_error(8232, f"Asset at '{audio_path}' does not support attenuation settings")

    if inner_radius is not None:
        attenuation_settings.set_editor_property("inner_radius", float(inner_radius))
    if outer_radius is not None:
        attenuation_settings.set_editor_property("outer_radius", float(outer_radius))
    if falloff_distance is not None:
        attenuation_settings.set_editor_property("falloff_distance", float(falloff_distance))

    unreal.EditorAssetLibrary.save_asset(audio_path)

    return make_result(
        audioPath=audio_path,
        innerRadius=inner_radius,
        outerRadius=outer_radius,
        falloffDistance=falloff_distance,
    )
