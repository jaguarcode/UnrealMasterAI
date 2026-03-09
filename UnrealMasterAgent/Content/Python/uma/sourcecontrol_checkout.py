"""
sourcecontrol.checkout script.
Checks out asset paths for editing in source control.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param


@execute_wrapper
def execute(params):
    asset_paths = get_required_param(params, "assetPaths")

    if not asset_paths:
        return make_error(5201, "assetPaths must be a non-empty list")

    sc_provider = unreal.SourceControl.get_provider()
    if sc_provider is None:
        return make_error(5200, "No source control provider available")

    checked_out = []
    failed = []

    for path in asset_paths:
        result = sc_provider.execute(unreal.CheckOutOperation(), [path])
        if result == unreal.SourceControlOperationResult.SUCCEEDED:
            checked_out.append(path)
        else:
            failed.append(path)

    if failed:
        return make_result(
            checkedOut=checked_out,
            failed=failed,
            success=len(checked_out),
            errors=len(failed),
        )

    return make_result(checkedOut=checked_out, success=len(checked_out), errors=0)
