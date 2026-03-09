"""
sourcecontrol.getStatus script.
Gets source control status for the given asset paths.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    asset_paths = get_optional_param(params, "assetPaths")

    sc_provider = unreal.SourceControl.get_provider()
    if sc_provider is None:
        return make_error(5200, "No source control provider available")

    results = []
    paths_to_check = asset_paths if asset_paths else []

    if paths_to_check:
        for path in paths_to_check:
            state = sc_provider.get_state(path, unreal.SourceControlStateType.UNKNOWN)
            results.append({
                "assetPath": path,
                "isCheckedOut": state.is_checked_out() if state else False,
                "isModified": state.is_modified() if state else False,
                "isAdded": state.is_added() if state else False,
                "isDeleted": state.is_deleted() if state else False,
                "statusString": state.get_display_name() if state else "Unknown",
            })
    else:
        # Return overall provider status
        results = {"provider": sc_provider.get_name(), "enabled": sc_provider.is_enabled()}

    return make_result(statuses=results, count=len(results) if isinstance(results, list) else 1)
