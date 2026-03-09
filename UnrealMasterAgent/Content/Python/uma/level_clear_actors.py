"""
level.clearActors script.
Deletes all non-essential actors from the current level.
Keeps WorldSettings and DefaultPhysicsVolume (required by engine).
"""
import unreal
from uma.utils import execute_wrapper, make_result

PROTECTED_CLASSES = {
    "WorldSettings",
    "DefaultPhysicsVolume",
}


@execute_wrapper
def execute(params):
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    deleted = []
    skipped = []

    for actor in all_actors:
        class_name = actor.get_class().get_name()
        label = actor.get_actor_label()
        if class_name in PROTECTED_CLASSES:
            skipped.append(label)
            continue
        success = unreal.EditorLevelLibrary.destroy_actor(actor)
        if success:
            deleted.append(label)

    return make_result(deleted=deleted, skipped=skipped, deletedCount=len(deleted))
