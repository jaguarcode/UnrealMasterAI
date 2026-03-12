"""Debug: list MaterialEditingLibrary methods related to expressions."""
import unreal
from uma.utils import execute_wrapper, make_result


@execute_wrapper
def execute(params):
    mel = unreal.MaterialEditingLibrary
    methods = [m for m in dir(mel) if not m.startswith('_') and 'express' in m.lower() or 'delete' in m.lower() or 'get' in m.lower()]
    # Get all methods for full picture
    all_methods = [m for m in dir(mel) if not m.startswith('_')]
    return make_result(
        filteredMethods=methods,
        allMethods=all_methods,
    )
