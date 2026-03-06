"""
widget.getInfo script.
Returns the widget tree hierarchy, root widget type, and bindings count
for a Widget Blueprint.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


def _collect_tree(widget_tree, widget, depth=0):
    """Recursively collect widget tree as a list of dicts."""
    if widget is None:
        return []
    entry = {
        "name": widget.get_name(),
        "type": widget.__class__.__name__,
        "depth": depth,
    }
    children = []
    if widget_tree:
        for child in widget_tree.get_all_widgets():
            parent = unreal.WidgetTree.find_widget_parent(child) if hasattr(unreal.WidgetTree, "find_widget_parent") else None
            if parent is not None and parent.get_name() == widget.get_name() and child.get_name() != widget.get_name():
                children.extend(_collect_tree(widget_tree, child, depth + 1))
    entry["children"] = children
    return [entry]


@execute_wrapper
def execute(params):
    widget_path = get_required_param(params, "widgetPath")
    validate_path(widget_path)

    asset = unreal.EditorAssetLibrary.load_asset(widget_path)
    if asset is None:
        return make_error(7701, f"Widget Blueprint not found: '{widget_path}'")

    widget_bp = unreal.WidgetBlueprint.cast(asset) if hasattr(unreal, "WidgetBlueprint") else asset

    root_widget_type = "Unknown"
    widget_tree_list = []
    bindings_count = 0

    try:
        widget_tree = widget_bp.widget_tree if hasattr(widget_bp, "widget_tree") else None
        if widget_tree:
            root = widget_tree.root_widget if hasattr(widget_tree, "root_widget") else None
            if root:
                root_widget_type = root.__class__.__name__
                all_widgets = widget_tree.get_all_widgets()
                widget_tree_list = [
                    {"name": w.get_name(), "type": w.__class__.__name__}
                    for w in all_widgets
                ]
        bindings = widget_bp.bindings if hasattr(widget_bp, "bindings") else []
        bindings_count = len(bindings)
    except Exception:
        pass

    return make_result(
        widgetPath=widget_path,
        rootWidgetType=root_widget_type,
        widgetTree=widget_tree_list,
        widgetCount=len(widget_tree_list),
        bindingsCount=bindings_count,
    )
