"""
sequencer.addBinding script.
Adds a possessable or spawnable binding to a Level Sequence.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")
    actor_name = get_required_param(params, "actorName")
    binding_type = get_optional_param(params, "bindingType", default="possessable")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    movie_scene = sequence.get_movie_scene()
    if movie_scene is None:
        return make_error(5101, f"Failed to get MovieScene from sequence: {sequence_path}")

    binding_type_lower = binding_type.lower()
    if binding_type_lower == "possessable":
        binding = movie_scene.add_possessable(actor_name, unreal.Actor.static_class())
        binding_id = str(binding.get_id()) if binding is not None else None
    elif binding_type_lower == "spawnable":
        actor_class = unreal.EditorAssetLibrary.load_blueprint_class(actor_name) if actor_name.startswith("/") else unreal.Actor.static_class()
        binding = movie_scene.add_spawnable(actor_class)
        binding_id = str(binding.get_id()) if binding is not None else None
    else:
        return make_error(5102, f"Invalid bindingType '{binding_type}'. Must be 'possessable' or 'spawnable'.")

    if binding is None:
        return make_error(5101, f"Failed to add {binding_type} binding for actor '{actor_name}'")

    return make_result(
        sequencePath=sequence_path,
        actorName=actor_name,
        bindingType=binding_type_lower,
        bindingId=binding_id,
    )
