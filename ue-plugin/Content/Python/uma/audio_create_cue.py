"""
audio.create_cue script.
Create a SoundCue asset and optionally assign a SoundWave to it.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    cue_name = get_required_param(params, "cueName")
    cue_path = get_required_param(params, "cuePath")
    sound_wave_path = get_optional_param(params, "soundWavePath", "")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.SoundCueFactoryNew()
    cue = asset_tools.create_asset(cue_name, cue_path, unreal.SoundCue, factory)

    if not cue:
        return make_error(8210, f"Failed to create SoundCue '{cue_name}' at '{cue_path}'")

    if sound_wave_path:
        sound_wave = unreal.load_asset(sound_wave_path)
        if not sound_wave:
            return make_error(8211, f"SoundWave not found at '{sound_wave_path}'")
        wave_node = unreal.SoundNodeWavePlayer()
        wave_node.set_editor_property("sound_wave", sound_wave)
        cue.set_editor_property("first_node", wave_node)

    unreal.EditorAssetLibrary.save_asset(cue.get_path_name())

    return make_result(
        cuePath=cue.get_path_name(),
        cueName=cue_name,
        soundWavePath=sound_wave_path if sound_wave_path else None,
    )
