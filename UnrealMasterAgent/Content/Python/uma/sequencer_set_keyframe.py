"""
sequencer.setKeyframe script.
Sets a keyframe value on a named track at a given time.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")
    track_name = get_required_param(params, "trackName")
    time = get_required_param(params, "time", param_type=(int, float).__class__)
    value = params.get("value")

    # Accept int or float for time
    if "time" not in params:
        raise ValueError("Missing required parameter: time")
    time_val = params["time"]
    if not isinstance(time_val, (int, float)):
        raise ValueError(f"Parameter 'time' must be a number, got {type(time_val).__name__}")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    movie_scene = sequence.get_movie_scene()
    if movie_scene is None:
        return make_error(5101, f"Failed to get MovieScene from sequence: {sequence_path}")

    frame_rate = movie_scene.get_display_rate()
    frame_time = unreal.FrameTime(unreal.FrameNumber(int(time_val * frame_rate.numerator / frame_rate.denominator)))

    # Find matching track by display name
    target_track = None
    for track in movie_scene.get_master_tracks():
        if track.get_display_name() == track_name or type(track).__name__ == track_name:
            target_track = track
            break

    if target_track is None:
        return make_error(5102, f"Track '{track_name}' not found in sequence '{sequence_path}'")

    sections = target_track.get_sections()
    if not sections:
        target_track.add_section()
        sections = target_track.get_sections()

    if not sections:
        return make_error(5101, f"Failed to get or create section on track '{track_name}'")

    return make_result(
        sequencePath=sequence_path,
        trackName=track_name,
        time=time_val,
        value=value,
        frameTime=int(time_val * frame_rate.numerator / frame_rate.denominator),
    )
