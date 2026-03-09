"""
sequencer.addTrack script.
Adds a track to a Level Sequence's MovieScene.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param

TRACK_CLASS_MAP = {
    "audio": unreal.MovieSceneAudioTrack,
    "event": unreal.MovieSceneEventTrack,
    "fade": unreal.MovieSceneFadeTrack,
    "level_visibility": unreal.MovieSceneLevelVisibilityTrack,
    "camera_cut": unreal.MovieSceneCameraCutTrack,
    "cinematic_shot": unreal.MovieSceneCinematicShotTrack,
    "sub": unreal.MovieSceneSubTrack,
}


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")
    track_type = get_required_param(params, "trackType")
    object_path = get_optional_param(params, "objectPath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    movie_scene = sequence.get_movie_scene()
    if movie_scene is None:
        return make_error(5101, f"Failed to get MovieScene from sequence: {sequence_path}")

    track_key = track_type.lower()
    track_class = TRACK_CLASS_MAP.get(track_key)
    if track_class is None:
        return make_error(5102, f"Unknown track type '{track_type}'. Valid types: {list(TRACK_CLASS_MAP.keys())}")

    track = movie_scene.add_track(track_class)
    if track is None:
        return make_error(5101, f"Failed to add track of type '{track_type}'")

    return make_result(
        sequencePath=sequence_path,
        trackType=track_type,
        trackClass=track_class.__name__,
        objectPath=object_path,
    )
