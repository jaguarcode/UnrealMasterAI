"""
sequencer.open script.
Opens a Level Sequence asset in the Sequencer editor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    sequence_path = get_required_param(params, "sequencePath")

    sequence = unreal.load_object(None, sequence_path)
    if sequence is None:
        return make_error(5102, f"Level Sequence not found: {sequence_path}")

    subsystem = unreal.get_editor_subsystem(unreal.LevelSequenceEditorSubsystem)
    subsystem.open_level_sequence(sequence)

    return make_result(
        sequencePath=sequence_path,
        objectPath=str(sequence.get_path_name()),
    )
