"""
analyze.codeConventions script.
Reports naming convention violations and folder structure issues in a content directory.
Error codes: 9130-9139
"""
import unreal
import re
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


# UE naming convention prefixes by asset class
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


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game/", str)

    if ".." in directory:
        return make_error(9130, f"Path traversal not allowed: {directory}")

    try:
        asset_paths = unreal.EditorAssetLibrary.list_assets(directory, recursive=True, include_folder=False)
    except Exception as e:
        return make_error(9131, f"Failed to list assets in '{directory}': {str(e)}")

    violations = []
    folder_issues = []
    checked = 0
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    seen_folders = set()

    for asset_path in asset_paths:
        checked += 1
        try:
            asset_name = asset_path.split("/")[-1].split(".")[0]
            folder_path = "/".join(asset_path.split("/")[:-1])

            # Folder naming: should be PascalCase, no spaces or special chars
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

            # Asset naming convention check
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

            # Check for spaces in asset name
            if " " in asset_name:
                violations.append({
                    "assetPath": asset_path,
                    "assetName": asset_name,
                    "issue": "spaces_in_name",
                    "message": f"Asset name '{asset_name}' contains spaces",
                })

        except Exception:
            pass

    score = 100
    total_issues = len(violations) + len(folder_issues)
    if total_issues > 0:
        score = max(0, 100 - min(100, total_issues * 3))

    return make_result(
        directory=directory,
        assetsChecked=checked,
        conventionScore=score,
        violationCount=len(violations),
        folderIssueCount=len(folder_issues),
        violations=violations,
        folderIssues=folder_issues,
    )
