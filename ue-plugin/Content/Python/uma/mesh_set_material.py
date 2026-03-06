"""
mesh.setMaterial script.
Assigns a material asset to a material slot on a static mesh.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    mesh_path = get_required_param(params, "meshPath")
    material_path = get_required_param(params, "materialPath")
    slot_index = get_optional_param(params, "slotIndex", default=0, param_type=int)

    validate_path(mesh_path)
    validate_path(material_path)

    mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
    if mesh is None:
        return make_error(5102, f"Mesh not found: {mesh_path}")

    if not isinstance(mesh, unreal.StaticMesh):
        return make_error(5102, f"Asset is not a StaticMesh: {mesh_path}")

    material = unreal.EditorAssetLibrary.load_asset(material_path)
    if material is None:
        return make_error(5102, f"Material not found: {material_path}")

    num_slots = mesh.get_num_sections(0)
    if slot_index < 0 or slot_index >= num_slots:
        return make_error(5102, f"Slot index {slot_index} out of range (mesh has {num_slots} slots)")

    mesh.set_material(slot_index, material)
    unreal.EditorAssetLibrary.save_asset(mesh_path)

    return make_result(
        meshPath=mesh_path,
        materialPath=material_path,
        slotIndex=slot_index,
    )
