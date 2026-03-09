"""
widget.setProperty script.
Sets a property on a named element within a Widget Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    widget_path = get_required_param(params, "widgetPath")
    element_name = get_required_param(params, "elementName")
    property_name = get_required_param(params, "propertyName")
    property_value = get_required_param(params, "propertyValue")

    validate_path(widget_path)

    asset = unreal.EditorAssetLibrary.load_asset(widget_path)
    if asset is None:
        return make_error(7701, f"Widget Blueprint not found: '{widget_path}'")

    widget_tree = asset.widget_tree if hasattr(asset, "widget_tree") else None
    if widget_tree is None:
        return make_error(7703, f"Widget Blueprint has no widget tree: '{widget_path}'")

    all_widgets = widget_tree.get_all_widgets()
    target_widget = next((w for w in all_widgets if w.get_name() == element_name), None)
    if target_widget is None:
        return make_error(7706, f"Element '{element_name}' not found in widget tree of '{widget_path}'")

    # Set the property via reflection
    if not hasattr(target_widget, property_name):
        return make_error(7707, f"Property '{property_name}' not found on element '{element_name}' ({target_widget.__class__.__name__})")

    try:
        # Attempt simple string-coerced set; callers may pass JSON-encoded values
        existing = getattr(target_widget, property_name)
        if isinstance(existing, bool):
            coerced = property_value.lower() in ("true", "1", "yes")
        elif isinstance(existing, int):
            coerced = int(property_value)
        elif isinstance(existing, float):
            coerced = float(property_value)
        else:
            coerced = property_value
        setattr(target_widget, property_name, coerced)
    except Exception as exc:
        return make_error(7708, f"Failed to set property '{property_name}' on '{element_name}': {exc}")

    unreal.EditorAssetLibrary.save_asset(widget_path, only_if_is_dirty=False)

    return make_result(
        widgetPath=widget_path,
        elementName=element_name,
        propertyName=property_name,
        propertyValue=property_value,
    )
