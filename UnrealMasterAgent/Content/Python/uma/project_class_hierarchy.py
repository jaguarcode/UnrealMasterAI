"""
project_class_hierarchy.py - Returns Blueprint/C++ class inheritance tree.
"""
import unreal
import json
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


def _build_class_tree(root_class_name):
    """Build a class hierarchy tree starting from root_class_name."""
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    # Search for Blueprint assets
    filter_obj = unreal.ARFilter(
        class_names=['Blueprint'],
        recursive_classes=True,
    )
    blueprint_assets = asset_registry.get_assets(filter_obj)

    # Build parent -> children map
    hierarchy = {}
    class_info = {}

    for asset_data in blueprint_assets:
        bp_path = str(asset_data.object_path)
        parent_class = str(asset_data.get_tag_value('ParentClass')) if asset_data.get_tag_value('ParentClass') else 'Unknown'

        # Normalize class name (strip path prefix if present)
        class_name = str(asset_data.asset_name)
        parent_short = parent_class.split('.')[-1].rstrip("'") if parent_class else 'Unknown'

        class_info[class_name] = {
            'name': class_name,
            'path': bp_path,
            'parent': parent_short,
            'type': 'Blueprint',
        }

        if parent_short not in hierarchy:
            hierarchy[parent_short] = []
        hierarchy[parent_short].append(class_name)

    # Filter to root class subtree if specified
    if root_class_name:
        subtree_classes = set()
        queue = [root_class_name]
        while queue:
            current = queue.pop(0)
            subtree_classes.add(current)
            children = hierarchy.get(current, [])
            queue.extend(children)

        hierarchy = {k: v for k, v in hierarchy.items() if k in subtree_classes}
        class_info = {k: v for k, v in class_info.items() if k in subtree_classes}

    return hierarchy, class_info


@execute_wrapper
def execute(params):
    root_class = get_optional_param(params, 'rootClass', default=None, param_type=str)

    try:
        hierarchy, class_info = _build_class_tree(root_class)
    except Exception as e:
        return make_error(5101, f'Failed to build class hierarchy: {e}')

    return make_result(
        root_class=root_class,
        hierarchy=hierarchy,
        classes=class_info,
        total_classes=len(class_info),
    )
