"""
sequencer.getInfo script.
Returns tracks, bindings, frame range, and play rate for a Level Sequence.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    movie_scene = sequence.get_movie_scene()
    if movie_scene is None:
        return make_error(5101, f"Failed to get MovieScene from sequence: {sequence_path}")

    display_rate = movie_scene.get_display_rate()
    play_back_range = movie_scene.get_playback_range()

    tracks = []
    for track in movie_scene.get_master_tracks():
        tracks.append({
            "name": str(track.get_display_name()),
            "class": type(track).__name__,
        })

    bindings = []
    for binding in movie_scene.get_possessables():
        bindings.append({
            "name": str(binding.get_name()),
            "id": str(binding.get_id()),
            "type": "possessable",
        })
    for binding in movie_scene.get_spawnables():
        bindings.append({
            "name": type(binding.get_object_template()).__name__ if binding.get_object_template() else "unknown",
            "id": str(binding.get_id()),
            "type": "spawnable",
        })

    frame_rate_str = f"{display_rate.numerator}/{display_rate.denominator}"

    return make_result(
        sequencePath=sequence_path,
        objectPath=str(sequence.get_path_name()),
        tracks=tracks,
        bindings=bindings,
        frameRange={
            "start": play_back_range.get_lower_bound_value().value,
            "end": play_back_range.get_upper_bound_value().value,
        },
        playRate=frame_rate_str,
    )
