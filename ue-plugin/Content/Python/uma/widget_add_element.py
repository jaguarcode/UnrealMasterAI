"""
widget.addElement script.
Adds a UI element (e.g. TextBlock, Button, Image) to a Widget Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path

# Map of element type names to Unreal widget classes
_ELEMENT_TYPE_MAP = {
    "TextBlock": "TextBlock",
    "Button": "Button",
    "Image": "Image",
    "CanvasPanel": "CanvasPanel",
    "HorizontalBox": "HorizontalBox",
    "VerticalBox": "VerticalBox",
    "ScrollBox": "ScrollBox",
    "Border": "Border",
    "Overlay": "Overlay",
    "SizeBox": "SizeBox",
    "GridPanel": "GridPanel",
    "CheckBox": "CheckBox",
    "ProgressBar": "ProgressBar",
    "Slider": "Slider",
    "EditableText": "EditableText",
    "ComboBoxString": "ComboBoxString",
    "ListView": "ListView",
    "WidgetSwitcher": "WidgetSwitcher",
    "SpinBox": "SpinBox",
    "RichTextBlock": "RichTextBlock",
}


@execute_wrapper
def execute(params):
    widget_path = get_required_param(params, "widgetPath")
    element_type = get_required_param(params, "elementType")
    element_name = get_required_param(params, "elementName")
    parent_name = get_optional_param(params, "parentName", default=None, param_type=str)

    validate_path(widget_path)

    asset = unreal.EditorAssetLibrary.load_asset(widget_path)
    if asset is None:
        return make_error(7701, f"Widget Blueprint not found: '{widget_path}'")

    # Resolve element class
    class_name = _ELEMENT_TYPE_MAP.get(element_type, element_type)
    widget_class = getattr(unreal, class_name, None)
    if widget_class is None:
        return make_error(7702, f"Unknown element type: '{element_type}'")

    widget_tree = asset.widget_tree if hasattr(asset, "widget_tree") else None
    if widget_tree is None:
        return make_error(7703, f"Widget Blueprint has no widget tree: '{widget_path}'")

    new_widget = widget_tree.construct_widget(widget_class, unreal.Name(element_name))
    if new_widget is None:
        return make_error(7704, f"Failed to construct widget element '{element_name}' of type '{element_type}'")

    # Attempt to attach to parent if specified
    if parent_name:
        all_widgets = widget_tree.get_all_widgets()
        parent_widget = next((w for w in all_widgets if w.get_name() == parent_name), None)
        if parent_widget is None:
            return make_error(7705, f"Parent widget '{parent_name}' not found in widget tree")

    unreal.EditorAssetLibrary.save_asset(widget_path, only_if_is_dirty=False)

    return make_result(
        widgetPath=widget_path,
        elementName=element_name,
        elementType=element_type,
        parentName=parent_name,
    )
