"""Debug: list SubobjectDataSubsystem methods and test add_new_subobject."""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    methods = [m for m in dir(sub) if not m.startswith('_') and callable(getattr(sub, m, None))]

    # Also check what setup_playable_level used
    # Try creating a test BP and checking handles
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    eal = unreal.EditorAssetLibrary

    test_path = "/Game/Blueprints/BP_DebugTest"
    if eal.does_asset_exist(test_path):
        eal.delete_asset(test_path)

    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.Actor)
    bp = asset_tools.create_asset("BP_DebugTest", "/Game/Blueprints", unreal.Blueprint, factory)

    handles = sub.k2_gather_subobject_data_for_blueprint(bp)
    handle_info = []
    for i, h in enumerate(handles):
        data = sub.find_subobject_data_from_handle(h) if hasattr(sub, 'find_subobject_data_from_handle') else None
        handle_info.append(f"Handle {i}: data={data}")

    # Try adding component
    comp_class = unreal.load_class(None, "/Script/Engine.StaticMeshComponent")
    p = unreal.AddNewSubobjectParams()
    p.set_editor_property("new_class", comp_class)
    p.set_editor_property("blueprint_context", bp)
    if handles:
        p.set_editor_property("parent_handle", handles[0])

    result_handle, fail_reason = sub.add_new_subobject(p)
    add_result = f"fail_reason='{fail_reason}' type={type(fail_reason)} bool={bool(fail_reason)}"

    # Check handles after add
    handles_after = sub.k2_gather_subobject_data_for_blueprint(bp)

    # Clean up
    eal.delete_asset(test_path)

    return make_result(
        methods=methods,
        handleCount=len(handles),
        handleInfo=handle_info,
        addResult=add_result,
        handlesAfter=len(handles_after),
    )
