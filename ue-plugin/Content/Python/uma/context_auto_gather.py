"""
context.autoGather script.
Gathers comprehensive project context: project metadata, code stats, content inventory,
current editor state, and optionally naming conventions.
Error codes: 9200-9210
"""
import unreal
import re
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


# Asset class name prefixes for convention detection
EXPECTED_PREFIXES = {
    "Blueprint": "BP_",
    "StaticMesh": "SM_",
    "SkeletalMesh": "SK_",
    "Texture2D": "T_",
    "TextureCube": "TC_",
    "Material": "M_",
    "MaterialInstance": "MI_",
    "MaterialInstanceConstant": "MI_",
    "ParticleSystem": "PS_",
    "NiagaraSystem": "NS_",
    "SoundWave": "S_",
    "SoundCue": "SC_",
    "AnimSequence": "AS_",
    "AnimBlueprint": "ABP_",
    "AnimMontage": "AM_",
    "PhysicsAsset": "PA_",
    "DataTable": "DT_",
    "DataAsset": "DA_",
    "WidgetBlueprint": "WBP_",
}


def _gather_project_info():
    """Gather basic project metadata."""
    try:
        project_name = unreal.SystemLibrary.get_game_name()
    except Exception:
        project_name = "Unknown"

    try:
        engine_version = unreal.SystemLibrary.get_engine_version()
    except Exception:
        engine_version = "Unknown"

    try:
        project_settings = unreal.get_default_object(unreal.GeneralProjectSettings)
        project_description = project_settings.description if project_settings else ""
        company_name = project_settings.company_name if project_settings else ""
    except Exception:
        project_description = ""
        company_name = ""

    # Gather target platforms from project settings
    target_platforms = []
    try:
        platforms_settings = unreal.get_default_object(unreal.PlatformsMenuSettings)
        if platforms_settings:
            target_platforms = list(platforms_settings.target_platforms) if hasattr(platforms_settings, 'target_platforms') else []
    except Exception:
        pass

    return {
        "name": project_name,
        "engineVersion": engine_version,
        "description": project_description,
        "companyName": company_name,
        "targetPlatforms": [str(p) for p in target_platforms],
    }


def _gather_code_info():
    """Gather code module and asset class statistics."""
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    blueprint_count = 0
    cpp_class_count = 0
    modules = []

    try:
        # Count blueprints in /Game/
        bp_filter = unreal.ARFilter(
            class_names=["Blueprint"],
            package_paths=["/Game/"],
            recursive_paths=True,
        )
        blueprints = asset_registry.get_assets(bp_filter)
        blueprint_count = len(blueprints)
    except Exception:
        pass

    try:
        # Count native (C++) classes via class hierarchy
        native_classes = unreal.ObjectLibrary.get_all_classes()
        cpp_class_count = len([c for c in native_classes if c is not None]) if native_classes else 0
    except Exception:
        pass

    # Gather enabled plugins
    enabled_plugins = []
    try:
        plugin_manager = unreal.PluginBlueprintLibrary if hasattr(unreal, 'PluginBlueprintLibrary') else None
        if plugin_manager and hasattr(plugin_manager, 'get_enabled_plugin_names'):
            enabled_plugins = list(plugin_manager.get_enabled_plugin_names())
    except Exception:
        pass

    # Gather module names from asset registry source files
    try:
        module_filter = unreal.ARFilter(
            package_paths=["/Script/"],
            recursive_paths=True,
        )
        script_assets = asset_registry.get_assets(module_filter)
        seen_modules = set()
        for asset in script_assets:
            pkg = str(asset.package_name)
            parts = pkg.split("/")
            if len(parts) >= 3 and parts[1] == "Script":
                seen_modules.add(parts[2])
        modules = sorted(list(seen_modules))
    except Exception:
        pass

    return {
        "modules": modules,
        "cppClassCount": cpp_class_count,
        "blueprintCount": blueprint_count,
        "enabledPlugins": enabled_plugins,
    }


def _gather_content_info():
    """Gather content browser inventory: totals, by-type counts, folder structure, recent assets."""
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    total_assets = 0
    assets_by_type = {}
    top_folders = []
    recently_modified = []

    try:
        all_assets = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False)
        total_assets = len(all_assets)

        # Count by asset type
        type_counts = {}
        asset_timestamps = []

        for asset_path in all_assets:
            try:
                asset_data = asset_registry.get_asset_by_object_path(asset_path)
                if asset_data and asset_data.is_valid():
                    class_name = str(asset_data.asset_class_path.asset_name)
                    type_counts[class_name] = type_counts.get(class_name, 0) + 1

                    # Collect timestamp info for recency
                    try:
                        pkg_name = str(asset_data.package_name)
                        asset_timestamps.append({
                            "assetPath": asset_path,
                            "assetClass": class_name,
                            "packageName": pkg_name,
                        })
                    except Exception:
                        pass
            except Exception:
                pass

        assets_by_type = type_counts

        # Last 10 recently modified (use package load order as proxy since timestamps aren't directly available)
        recently_modified = asset_timestamps[-10:] if len(asset_timestamps) >= 10 else asset_timestamps

    except Exception:
        pass

    # Top-level folder structure under /Game/
    try:
        folders = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=False, include_folder=True)
        top_folders = sorted([
            f.rstrip("/").split("/")[-1]
            for f in folders
            if f.endswith("/") or not "." in f.split("/")[-1]
        ])
    except Exception:
        try:
            # Fallback: derive from asset paths
            all_assets_for_folders = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False)
            seen = set()
            for path in all_assets_for_folders:
                parts = path.split("/")
                if len(parts) >= 3:
                    seen.add(parts[2])
            top_folders = sorted(list(seen))
        except Exception:
            pass

    return {
        "totalAssets": total_assets,
        "assetsByType": assets_by_type,
        "topLevelFolders": top_folders,
        "recentlyModified": recently_modified,
    }


def _gather_current_state(include_viewport):
    """Gather current editor state: open level, actors, selection, viewport."""
    open_level = ""
    actor_count = 0
    selected_actors = []
    is_dirty = False
    viewport_info = None

    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world:
            open_level = str(world.get_name())
            is_dirty = world.is_dirty()
    except Exception:
        pass

    try:
        all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
        actor_count = len(all_actors) if all_actors else 0
    except Exception:
        pass

    try:
        selected = unreal.EditorLevelLibrary.get_selected_level_actors()
        selected_actors = [str(a.get_name()) for a in selected] if selected else []
    except Exception:
        pass

    if include_viewport:
        try:
            viewport_client = unreal.EditorLevelLibrary.get_editor_world().get_first_player_controller()
            if viewport_client:
                viewport_info = {"available": True}
            else:
                # Try getting viewport via subsystem
                subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                if subsystem:
                    loc = subsystem.get_level_viewport_camera_info()
                    if loc:
                        cam_loc, cam_rot = loc
                        viewport_info = {
                            "cameraLocation": {"x": cam_loc.x, "y": cam_loc.y, "z": cam_loc.z},
                            "cameraRotation": {"pitch": cam_rot.pitch, "yaw": cam_rot.yaw, "roll": cam_rot.roll},
                        }
        except Exception:
            try:
                subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                if subsystem:
                    cam_info = subsystem.get_level_viewport_camera_info()
                    if cam_info:
                        cam_loc, cam_rot = cam_info
                        viewport_info = {
                            "cameraLocation": {"x": cam_loc.x, "y": cam_loc.y, "z": cam_loc.z},
                            "cameraRotation": {"pitch": cam_rot.pitch, "yaw": cam_rot.yaw, "roll": cam_rot.roll},
                        }
            except Exception:
                viewport_info = {"available": False, "error": "Could not retrieve viewport info"}

    state = {
        "openLevel": open_level,
        "actorCount": actor_count,
        "selectedActors": selected_actors,
        "isDirty": is_dirty,
    }
    if include_viewport:
        state["viewport"] = viewport_info

    return state


def _gather_conventions():
    """Detect naming and folder conventions from /Game/ assets."""
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
    violations = []
    folder_issues = []
    checked = 0
    seen_folders = set()

    try:
        asset_paths = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False)
    except Exception:
        return {"checked": 0, "violations": [], "folderIssues": [], "conventionScore": 100}

    for asset_path in asset_paths:
        checked += 1
        try:
            asset_name = asset_path.split("/")[-1].split(".")[0]
            folder_path = "/".join(asset_path.split("/")[:-1])

            if folder_path not in seen_folders:
                seen_folders.add(folder_path)
                for segment in folder_path.split("/"):
                    if not segment:
                        continue
                    if " " in segment:
                        folder_issues.append({
                            "folderPath": folder_path,
                            "issue": "spaces_in_folder_name",
                            "message": f"Folder '{segment}' contains spaces",
                        })
                    elif re.search(r"[^A-Za-z0-9_]", segment):
                        folder_issues.append({
                            "folderPath": folder_path,
                            "issue": "special_chars_in_folder",
                            "message": f"Folder '{segment}' contains special characters",
                        })

            asset_data = asset_registry.get_asset_by_object_path(asset_path)
            if not asset_data or not asset_data.is_valid():
                continue

            class_name = str(asset_data.asset_class_path.asset_name)
            expected_prefix = EXPECTED_PREFIXES.get(class_name)

            if expected_prefix and not asset_name.startswith(expected_prefix):
                violations.append({
                    "assetPath": asset_path,
                    "assetName": asset_name,
                    "assetClass": class_name,
                    "expectedPrefix": expected_prefix,
                    "issue": "missing_prefix",
                    "message": f"'{asset_name}' should start with '{expected_prefix}' for {class_name}",
                })

            if " " in asset_name:
                violations.append({
                    "assetPath": asset_path,
                    "assetName": asset_name,
                    "issue": "spaces_in_name",
                    "message": f"Asset name '{asset_name}' contains spaces",
                })
        except Exception:
            pass

    total_issues = len(violations) + len(folder_issues)
    score = max(0, 100 - min(100, total_issues * 3)) if total_issues > 0 else 100

    return {
        "checked": checked,
        "conventionScore": score,
        "violationCount": len(violations),
        "folderIssueCount": len(folder_issues),
        "violations": violations[:20],  # cap at 20 to avoid huge payloads
        "folderIssues": folder_issues[:20],
    }


@execute_wrapper
def execute(params):
    include_conventions = get_optional_param(params, "includeConventions", True, bool)
    include_viewport = get_optional_param(params, "includeViewport", True, bool)

    try:
        project_info = _gather_project_info()
    except Exception as e:
        return make_error(9200, f"Failed to gather project info: {str(e)}")

    try:
        code_info = _gather_code_info()
    except Exception as e:
        return make_error(9201, f"Failed to gather code info: {str(e)}")

    try:
        content_info = _gather_content_info()
    except Exception as e:
        return make_error(9202, f"Failed to gather content info: {str(e)}")

    try:
        current_state = _gather_current_state(include_viewport)
    except Exception as e:
        return make_error(9203, f"Failed to gather current editor state: {str(e)}")

    result = {
        "project": project_info,
        "code": code_info,
        "content": content_info,
        "currentState": current_state,
    }

    if include_conventions:
        try:
            result["conventions"] = _gather_conventions()
        except Exception as e:
            return make_error(9204, f"Failed to gather conventions: {str(e)}")

    return make_result(**result)
