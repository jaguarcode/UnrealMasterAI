"""Debug: get component template from SubobjectData via get_editor_property."""
import unreal
from uma.utils import execute_wrapper, make_result


@execute_wrapper
def execute(params):
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    eal = unreal.EditorAssetLibrary
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)

    test_path = "/Game/Blueprints/BP_DebugTest2"
    if eal.does_asset_exist(test_path):
        eal.delete_asset(test_path)

    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", unreal.Actor)
    bp = asset_tools.create_asset("BP_DebugTest2", "/Game/Blueprints", unreal.Blueprint, factory)

    # Add StaticMeshComponent
    handles_before = sub.k2_gather_subobject_data_for_blueprint(bp)
    comp_class = unreal.load_class(None, "/Script/Engine.StaticMeshComponent")
    p = unreal.AddNewSubobjectParams()
    p.set_editor_property("new_class", comp_class)
    p.set_editor_property("blueprint_context", bp)
    if handles_before:
        p.set_editor_property("parent_handle", handles_before[0])
    result_handle, fail_reason = sub.add_new_subobject(p)

    # Get all handles after adding
    handles_after = sub.k2_gather_subobject_data_for_blueprint(bp)

    # For each handle, try to get SubobjectData and inspect its editor properties
    handle_info = []
    for i, h in enumerate(handles_after):
        data = sub.k2_find_subobject_data_from_handle(h)
        if data:
            info = {"index": i}
            # Try common SubobjectData properties
            for prop in ["handle", "object", "component_template", "scs_node"]:
                try:
                    val = data.get_editor_property(prop)
                    info[prop] = f"{type(val).__name__}: {val}"
                except Exception as e:
                    info[prop] = f"ERR: {e}"
            # Try to_tuple
            try:
                tup = data.to_tuple()
                info["tuple"] = str(tup)
            except Exception as e:
                info["tuple"] = f"ERR: {e}"
            handle_info.append(info)

    # Also try: iterate SCS nodes via generated_class or blueprint internals
    # Try accessing BP's components via CDO
    cdo_info = {}
    try:
        gen_class = bp.generated_class()
        cdo = unreal.get_default_object(gen_class)
        comps = cdo.get_components_by_class(unreal.StaticMeshComponent)
        cdo_info["smc_count"] = len(comps) if comps else 0
        if comps:
            smc = comps[0]
            cdo_info["smc_mesh"] = str(smc.static_mesh) if hasattr(smc, 'static_mesh') else "no attr"
            # Try setting mesh
            cube = unreal.load_asset("/Engine/BasicShapes/Cube")
            smc.set_static_mesh(cube)
            cdo_info["after_set"] = str(smc.static_mesh) if hasattr(smc, 'static_mesh') else "no attr"
    except Exception as e:
        cdo_info["error"] = str(e)

    # Clean up
    eal.delete_asset(test_path)

    return make_result(handleInfo=handle_info, cdoInfo=cdo_info)
