"""
analyze.performanceHints script.
Provides draw call estimates, texture memory usage, and mesh complexity hints for a level.
Error codes: 9120-9129
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    level_path = get_optional_param(params, "levelPath", None, str)

    hints = []
    draw_call_estimate = 0
    texture_memory_mb = 0.0
    mesh_complexity = {}

    # Load specified level or use current world
    world = None
    try:
        if level_path:
            if ".." in level_path:
                return make_error(9120, f"Path traversal not allowed: {level_path}")
            world = unreal.EditorLoadingAndSavingUtils.load_map(level_path)
        else:
            world = unreal.EditorLevelLibrary.get_editor_world()
    except Exception as e:
        return make_error(9121, f"Failed to load level: {str(e)}")

    if not world:
        return make_error(9122, "No world available")

    actors = []
    try:
        actors = unreal.EditorLevelLibrary.get_all_level_actors()
    except Exception as e:
        hints.append({"type": "warning", "message": f"Could not enumerate actors: {str(e)}"})

    static_mesh_actors = 0
    skeletal_mesh_actors = 0
    light_actors = 0
    translucent_materials = 0

    for actor in actors:
        try:
            if isinstance(actor, unreal.StaticMeshActor):
                static_mesh_actors += 1
                draw_call_estimate += 1

                smc = actor.static_mesh_component
                if smc:
                    mesh = smc.static_mesh
                    if mesh:
                        lod_count = mesh.get_num_lods()
                        tri_count = mesh.get_num_triangles(0)
                        if tri_count > 100000:
                            hints.append({
                                "type": "high_poly_mesh",
                                "actor": actor.get_name(),
                                "triangles": tri_count,
                                "message": "Consider adding LODs or reducing polygon count",
                            })

                    # Count materials (each unique material = potential draw call)
                    num_materials = len(smc.get_materials())
                    draw_call_estimate += max(0, num_materials - 1)

            elif isinstance(actor, unreal.SkeletalMeshActor):
                skeletal_mesh_actors += 1
                draw_call_estimate += 2  # skeletal meshes cost more

            elif isinstance(actor, (unreal.PointLight, unreal.SpotLight, unreal.RectLight)):
                light_actors += 1
                if light_actors > 50:
                    hints.append({
                        "type": "too_many_dynamic_lights",
                        "count": light_actors,
                        "message": "High dynamic light count impacts performance; consider static/stationary lights",
                    })
        except Exception:
            pass

    # Texture memory estimate
    try:
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
        texture_assets = unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False)
        for asset_path in texture_assets[:200]:  # limit scan
            try:
                asset_data = asset_registry.get_asset_by_object_path(asset_path)
                if asset_data and asset_data.asset_class_path.asset_name in ("Texture2D", "TextureCube"):
                    tex = unreal.EditorAssetLibrary.load_asset(asset_path)
                    if isinstance(tex, unreal.Texture2D):
                        w = tex.blueprint_get_size_x()
                        h = tex.blueprint_get_size_y()
                        # Rough estimate: 4 bytes per pixel uncompressed
                        texture_memory_mb += (w * h * 4) / (1024 * 1024)
            except Exception:
                pass
    except Exception:
        pass

    # Draw call hints
    if draw_call_estimate > 2000:
        hints.append({
            "type": "high_draw_calls",
            "estimate": draw_call_estimate,
            "message": "Draw call count is high; consider merging static meshes or using instancing",
        })

    if texture_memory_mb > 512:
        hints.append({
            "type": "high_texture_memory",
            "estimatedMB": round(texture_memory_mb, 2),
            "message": "High texture memory usage; review texture resolutions and compression settings",
        })

    return make_result(
        levelPath=level_path,
        drawCallEstimate=draw_call_estimate,
        textureMemoryEstimateMB=round(texture_memory_mb, 2),
        actorCounts={
            "staticMesh": static_mesh_actors,
            "skeletalMesh": skeletal_mesh_actors,
            "lights": light_actors,
        },
        hintCount=len(hints),
        hints=hints,
    )
