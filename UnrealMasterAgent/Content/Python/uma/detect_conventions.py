"""
detect.conventions script.
Scans project content to detect naming patterns, folder organization, blueprint style,
common base classes, input system, physics profile, and rendering approach.
Error codes: 9200-9299
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


# UE standard asset prefixes to detect
KNOWN_PREFIXES = [
    "BP_", "SM_", "M_", "T_", "MI_", "WBP_", "ABP_", "SK_",
    "A_", "S_", "E_", "NS_", "PS_", "SC_", "DT_", "DA_",
    "AM_", "AS_", "PA_", "TC_",
]

# Type folders indicating "by-type" organization
TYPE_FOLDER_KEYWORDS = [
    "meshes", "staticmeshes", "skeletalmeshes",
    "materials", "materialinstances",
    "textures",
    "blueprints",
    "animations", "animsequences",
    "sounds", "audio",
    "particles", "effects", "vfx",
    "ui", "widgets", "userinterface",
    "datatables", "data",
]

# Base class names used to detect common subclasses
BASE_CLASS_PATTERNS = {
    "GameMode":         ["GameModeBase", "GameMode"],
    "Character":        ["Character", "Pawn"],
    "PlayerController": ["PlayerController"],
}

# Enhanced Input asset class indicators
ENHANCED_INPUT_CLASSES = {"InputAction", "InputMappingContext"}
LEGACY_INPUT_CLASSES   = {"InputSettings"}  # legacy axis/action stored in project settings


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game/", str)

    if ".." in directory:
        return make_error(9200, f"Path traversal not allowed: {directory}")

    # --- Gather all assets ---
    try:
        asset_paths = unreal.EditorAssetLibrary.list_assets(
            directory, recursive=True, include_folder=False
        )
    except Exception as e:
        return make_error(9201, f"Failed to list assets in '{directory}': {str(e)}")

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    # Counters / collectors
    prefix_hits = {p: 0 for p in KNOWN_PREFIXES}
    type_folder_count = 0
    feature_folder_count = 0
    seen_folders = set()
    bp_count = 0
    cpp_count = 0
    base_class_hits = {k: [] for k in BASE_CLASS_PATTERNS}
    enhanced_input_found = False
    legacy_input_found = False

    for asset_path in asset_paths:
        try:
            asset_name = asset_path.split("/")[-1].split(".")[0]
            folder_path = "/".join(asset_path.split("/")[:-1])

            # -- Naming pattern detection --
            for prefix in KNOWN_PREFIXES:
                if asset_name.startswith(prefix):
                    prefix_hits[prefix] += 1
                    break

            # -- Folder organization detection --
            if folder_path not in seen_folders:
                seen_folders.add(folder_path)
                lower_segments = [s.lower() for s in folder_path.split("/") if s]
                for seg in lower_segments:
                    if seg in TYPE_FOLDER_KEYWORDS:
                        type_folder_count += 1
                        break
                else:
                    # Heuristic: more than 2 path levels below /Game/ suggests feature folders
                    game_relative = folder_path.replace("/Game/", "").strip("/")
                    depth = len([s for s in game_relative.split("/") if s])
                    if depth >= 2:
                        feature_folder_count += 1

            # -- Blueprint vs C++ detection --
            asset_data = asset_registry.get_asset_by_object_path(asset_path)
            if not asset_data or not asset_data.is_valid():
                continue

            class_name = str(asset_data.asset_class_path.asset_name)

            if class_name in ("Blueprint", "WidgetBlueprint", "AnimBlueprint"):
                bp_count += 1

                # -- Common base classes (inspect BP parent) --
                try:
                    loaded = unreal.EditorAssetLibrary.load_asset(asset_path)
                    if loaded and isinstance(loaded, unreal.Blueprint):
                        parent = loaded.get_editor_property("parent_class")
                        if parent:
                            parent_name = parent.get_name()
                            for category, patterns in BASE_CLASS_PATTERNS.items():
                                for pattern in patterns:
                                    if pattern in parent_name:
                                        bp_display = f"{asset_name} (parent: {parent_name})"
                                        if bp_display not in base_class_hits[category]:
                                            base_class_hits[category].append(bp_display)
                                        break
                except Exception:
                    pass

            # -- Input system detection --
            if class_name in ENHANCED_INPUT_CLASSES:
                enhanced_input_found = True
            if class_name in LEGACY_INPUT_CLASSES:
                legacy_input_found = True

        except Exception:
            pass

    # Count C++ classes via class registry (approximate via non-BP asset count)
    # We approximate C++ by counting Actor/Character/etc. assets that are not Blueprints
    try:
        all_classes = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False)
        cpp_count = max(0, len(all_classes) - bp_count)
    except Exception:
        cpp_count = 0

    # -- Naming pattern result --
    naming_pattern = {p: prefix_hits[p] for p in KNOWN_PREFIXES if prefix_hits[p] > 0}
    active_prefixes = list(naming_pattern.keys())

    # -- Folder organization --
    total_folders = type_folder_count + feature_folder_count
    if total_folders == 0:
        folder_organization = "unknown"
    elif type_folder_count >= feature_folder_count:
        folder_organization = "by-type"
    else:
        folder_organization = "by-feature"

    # -- Blueprint style --
    total_classes = bp_count + max(cpp_count, 0)
    if total_classes == 0:
        blueprint_style = "unknown"
    else:
        bp_ratio = bp_count / total_classes
        if bp_ratio >= 0.75:
            blueprint_style = "heavy-BP"
        elif bp_ratio >= 0.35:
            blueprint_style = "hybrid"
        else:
            blueprint_style = "cpp-heavy"

    # -- Input system --
    if enhanced_input_found:
        input_system = "EnhancedInput"
    elif legacy_input_found:
        input_system = "LegacyInput"
    else:
        input_system = "unknown"

    # -- Physics profile (collision channels) --
    physics_profile = _detect_physics_profile()

    # -- Rendering approach --
    rendering_approach = _detect_rendering_approach()

    return make_result(
        directory=directory,
        assetsScanned=len(asset_paths),
        namingPattern={
            "activePrefixes": active_prefixes,
            "prefixHitCounts": naming_pattern,
        },
        folderOrganization=folder_organization,
        folderOrganizationDetails={
            "typeFolderCount": type_folder_count,
            "featureFolderCount": feature_folder_count,
        },
        blueprintStyle=blueprint_style,
        blueprintStyleDetails={
            "blueprintCount": bp_count,
            "cppEstimate": cpp_count,
        },
        commonBaseClasses=base_class_hits,
        inputSystem=input_system,
        physicsProfile=physics_profile,
        renderingApproach=rendering_approach,
    )


def _detect_physics_profile():
    """Detect collision channels and presets via project settings."""
    channels = []
    presets = []
    try:
        collision_profile = unreal.CollisionProfile.get_default_object()
        if collision_profile:
            # Channel names
            try:
                channel_infos = collision_profile.get_editor_property("channel_display_info")
                for info in channel_infos:
                    name = str(info.get_editor_property("display_name"))
                    if name:
                        channels.append(name)
            except Exception:
                pass
            # Preset names
            try:
                preset_list = collision_profile.get_editor_property("presets")
                for preset in preset_list:
                    name = str(preset.get_editor_property("name"))
                    if name:
                        presets.append(name)
            except Exception:
                pass
    except Exception:
        pass

    return {
        "collisionChannels": channels if channels else ["(unable to detect - requires editor access)"],
        "collisionPresets": presets if presets else ["(unable to detect - requires editor access)"],
    }


def _detect_rendering_approach():
    """Detect Lumen, Nanite, and forward vs deferred rendering from project settings."""
    indicators = {}

    try:
        renderer_settings = unreal.RendererSettings.get_default_object()
        if renderer_settings:
            # Lumen global illumination
            try:
                lumen_gi = renderer_settings.get_editor_property("dynamic_global_illumination_method")
                indicators["lumenGI"] = str(lumen_gi) if lumen_gi is not None else "unknown"
            except Exception:
                indicators["lumenGI"] = "unknown"

            # Lumen reflections
            try:
                lumen_ref = renderer_settings.get_editor_property("reflection_capture_resolution")
                indicators["reflectionCaptureResolution"] = int(lumen_ref) if lumen_ref is not None else "unknown"
            except Exception:
                indicators["reflectionCaptureResolution"] = "unknown"

            # Forward shading
            try:
                forward = renderer_settings.get_editor_property("forward_shading")
                indicators["forwardShading"] = bool(forward)
                indicators["shadingModel"] = "forward" if forward else "deferred"
            except Exception:
                indicators["shadingModel"] = "unknown"

            # Nanite
            try:
                nanite = renderer_settings.get_editor_property("nanite_mesh_percent_triangle_threshold")
                indicators["naniteEnabled"] = nanite is not None
            except Exception:
                indicators["naniteEnabled"] = "unknown"

            # Virtual Shadow Maps
            try:
                vsm = renderer_settings.get_editor_property("shadow_map_method")
                indicators["shadowMapMethod"] = str(vsm) if vsm is not None else "unknown"
            except Exception:
                indicators["shadowMapMethod"] = "unknown"

    except Exception as e:
        indicators["error"] = f"Could not read renderer settings: {str(e)}"

    return indicators
