"""
audio.get_info script.
Read duration, channels, sample rate, and compression settings from a SoundWave.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    audio_path = get_required_param(params, "audioPath")

    asset = unreal.load_asset(audio_path)
    if not asset:
        return make_error(8220, f"Audio asset not found at '{audio_path}'")

    if not isinstance(asset, unreal.SoundWave):
        return make_error(8221, f"Asset at '{audio_path}' is not a SoundWave")

    duration = asset.get_editor_property("duration")
    num_channels = asset.get_editor_property("num_channels")
    sample_rate = asset.get_editor_property("sample_rate_quality")
    compression_quality = asset.get_editor_property("compression_quality")

    return make_result(
        audioPath=audio_path,
        duration=duration,
        numChannels=num_channels,
        sampleRate=str(sample_rate),
        compressionQuality=compression_quality,
    )
