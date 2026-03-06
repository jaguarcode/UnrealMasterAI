"""
sourcecontrol.diff script.
Gets diff information for a single asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")

    sc_provider = unreal.SourceControl.get_provider()
    if sc_provider is None:
        return make_error(5200, "No source control provider available")

    state = sc_provider.get_state(asset_path, unreal.SourceControlStateType.UNKNOWN)
    if state is None:
        return make_error(5202, f"Could not get state for asset: {asset_path}")

    diff_info = {
        "assetPath": asset_path,
        "isModified": state.is_modified(),
        "isCheckedOut": state.is_checked_out(),
        "headRevision": state.get_hist_revision() if hasattr(state, "get_hist_revision") else None,
        "localRevision": state.get_revision() if hasattr(state, "get_revision") else None,
        "statusString": state.get_display_name(),
    }

    return make_result(diff=diff_info)
