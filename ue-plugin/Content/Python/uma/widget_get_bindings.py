"""
widget.getBindings script.
Returns property bindings and event dispatchers for a Widget Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    widget_path = get_required_param(params, "widgetPath")
    validate_path(widget_path)

    asset = unreal.EditorAssetLibrary.load_asset(widget_path)
    if asset is None:
        return make_error(7701, f"Widget Blueprint not found: '{widget_path}'")

    bindings = []
    event_dispatchers = []

    try:
        raw_bindings = asset.bindings if hasattr(asset, "bindings") else []
        for b in raw_bindings:
            entry = {
                "objectName": str(b.object_name) if hasattr(b, "object_name") else "",
                "propertyPath": str(b.property_path) if hasattr(b, "property_path") else "",
            }
            bindings.append(entry)
    except Exception:
        pass

    try:
        # Event dispatchers live in the blueprint's skeleton class
        skel_class = asset.skeleton_generated_class if hasattr(asset, "skeleton_generated_class") else None
        if skel_class:
            for prop in unreal.BlueprintEditorLibrary.get_blueprint_event_dispatcher_names(asset) if hasattr(unreal, "BlueprintEditorLibrary") else []:
                event_dispatchers.append(str(prop))
    except Exception:
        pass

    return make_result(
        widgetPath=widget_path,
        bindings=bindings,
        bindingsCount=len(bindings),
        eventDispatchers=event_dispatchers,
        eventDispatchersCount=len(event_dispatchers),
    )
