"""
editor.batchOperation script.
Performs batch operations (rename, move, setProperty, tag) on assets/actors.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param

VALID_OPERATIONS = {"rename", "move", "setProperty", "tag"}


@execute_wrapper
def execute(params):
    operation = get_required_param(params, "operation", str)
    targets = get_required_param(params, "targets", list)
    args = get_optional_param(params, "args", {}, dict)

    if operation not in VALID_OPERATIONS:
        return make_error(5102, f"Invalid operation '{operation}'. Must be one of: {sorted(VALID_OPERATIONS)}")

    if not targets:
        return make_error(5102, "targets list cannot be empty")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    results = []
    errors = []

    for target in targets:
        try:
            if operation == "rename":
                new_name = args.get("newName")
                if not new_name:
                    errors.append({"target": target, "error": "args.newName is required for rename"})
                    continue
                asset = unreal.EditorAssetLibrary.load_asset(target)
                if asset is None:
                    errors.append({"target": target, "error": "Asset not found"})
                    continue
                package_path = str(unreal.Paths.get_path(target))
                asset_tools.rename_assets([unreal.AssetRenameData(asset, package_path, new_name)])
                results.append({"target": target, "newName": new_name, "status": "renamed"})

            elif operation == "move":
                destination = args.get("destination")
                if not destination:
                    errors.append({"target": target, "error": "args.destination is required for move"})
                    continue
                success = unreal.EditorAssetLibrary.rename_asset(target, destination + "/" + target.split("/")[-1])
                if success:
                    results.append({"target": target, "destination": destination, "status": "moved"})
                else:
                    errors.append({"target": target, "error": "Move failed"})

            elif operation == "setProperty":
                prop_name = args.get("propertyName")
                prop_value = args.get("propertyValue")
                if prop_name is None:
                    errors.append({"target": target, "error": "args.propertyName is required for setProperty"})
                    continue
                asset = unreal.EditorAssetLibrary.load_asset(target)
                if asset is None:
                    errors.append({"target": target, "error": "Asset not found"})
                    continue
                unreal.SystemLibrary.set_object_property_by_name(asset, prop_name, str(prop_value))
                results.append({"target": target, "property": prop_name, "status": "set"})

            elif operation == "tag":
                tag_value = args.get("tag")
                if not tag_value:
                    errors.append({"target": target, "error": "args.tag is required for tag"})
                    continue
                asset = unreal.EditorAssetLibrary.load_asset(target)
                if asset is None:
                    errors.append({"target": target, "error": "Asset not found"})
                    continue
                tags = unreal.EditorAssetLibrary.get_metadata_tag_values(asset)
                tags["uma_tag"] = str(tag_value)
                unreal.EditorAssetLibrary.set_metadata_tag(asset, "uma_tag", str(tag_value))
                results.append({"target": target, "tag": tag_value, "status": "tagged"})

        except Exception as e:
            errors.append({"target": target, "error": str(e)})

    return make_result(
        operation=operation,
        results=results,
        errors=errors,
        successCount=len(results),
        errorCount=len(errors),
    )
