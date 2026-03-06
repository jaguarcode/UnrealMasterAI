"""
mesh.generateCollision script.
Generates collision geometry for a static mesh asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path

COLLISION_TYPES = {
    "box": unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX,
    "sphere": unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX,
    "capsule": unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX,
    "convex": unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AND_COMPLEX,
    "complex": unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE,
    "simple": unreal.CollisionTraceFlag.CTF_USE_SIMPLE_AS_COMPLEX,
}


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    collision_type = get_optional_param(params, "collisionType", default="simple")

    validate_path(mesh_path)

    mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh is None:
        return make_error(5102, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh, unreal.StaticMesh):
        return make_error(5102, f"Asset is not a StaticMesh: {mesh_path}")

    collision_type_lower = collision_type.lower()
    if collision_type_lower not in COLLISION_TYPES:
        valid = list(COLLISION_TYPES.keys())
        return make_error(5102, f"Invalid collisionType '{collision_type}'. Valid types: {valid}")

    trace_flag = COLLISION_TYPES[collision_type_lower]

    body_setup = mesh.get_editor_property("body_setup")
    if body_setup:
        body_setup.set_editor_property("collision_trace_flag", trace_flag)

    unreal.EditorAssetLibrary.save_asset(mesh_path)

    return make_result(
        meshPath=mesh_path,
        collisionType=collision_type,
    )
