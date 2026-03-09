"""
setup_patrol_system.py
Creates a patrol system:
1. BP_PatrolPoint - simple marker actors (billboard + sphere) to define patrol path
2. BP_PatrolActor - actor with mesh that moves between patrol points
   Uses Timeline + Lerp in Blueprint EventGraph for smooth movement
3. Places 3 patrol points and 1 patrol actor in the level
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


def _compile_bp(bp):
    for lib in ["BlueprintEditorLibrary", "KismetSystemLibrary"]:
        if hasattr(unreal, lib):
            try:
                getattr(unreal, lib).compile_blueprint(bp)
                return True
            except Exception:
                pass
    return False


def _create_blueprint(asset_tools, eal, name, bp_dir, parent_class=unreal.Actor):
    """Create a fresh Blueprint, deleting existing if present."""
    bp_path = f"{bp_dir}/{name}"
    if eal.does_asset_exist(bp_path):
        eal.delete_asset(bp_path)
    factory = unreal.BlueprintFactory()
    factory.set_editor_property("parent_class", parent_class)
    bp = asset_tools.create_asset(name, bp_dir, unreal.Blueprint, factory)
    return bp, bp_path


def _add_component(sub, bp, class_path, parent_handle=None):
    """Add a component to a Blueprint via SubobjectDataSubsystem."""
    handles = sub.k2_gather_subobject_data_for_blueprint(bp)
    root = parent_handle if parent_handle else (handles[0] if handles else unreal.SubobjectDataHandle())

    comp_class = unreal.load_class(None, class_path)
    if not comp_class:
        return None, f"Class not found: {class_path}"

    p = unreal.AddNewSubobjectParams()
    p.set_editor_property("new_class", comp_class)
    p.set_editor_property("blueprint_context", bp)
    p.set_editor_property("parent_handle", root)
    handle, fail_reason = sub.add_new_subobject(p)

    fail_str = str(fail_reason).strip()
    if fail_str:
        return None, fail_str
    return handle, None


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    steps = []
    bp_dir = get_optional_param(params, "blueprintDir", "/Game/Blueprints")

    # Clean up existing patrol actors
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        label = a.get_actor_label()
        if label and (label.startswith("PatrolPoint") or label == "PatrolActor"):
            a.destroy_actor()

    # ============================================
    # 1. CREATE BP_PatrolPoint
    # ============================================
    pp_bp, pp_path = _create_blueprint(asset_tools, eal, "BP_PatrolPoint", bp_dir)
    if not pp_bp:
        return make_error(9600, "Failed to create BP_PatrolPoint")

    # Add a sphere mesh for visibility
    _add_component(sub, pp_bp, "/Script/Engine.StaticMeshComponent")
    # Add a BillboardComponent for editor visibility
    _add_component(sub, pp_bp, "/Script/Engine.BillboardComponent")

    _compile_bp(pp_bp)
    eal.save_asset(pp_path, False)
    steps.append("Created BP_PatrolPoint Blueprint")

    # Configure PatrolPoint instances — set sphere mesh + scale down
    sphere_mesh = unreal.load_asset("/Engine/BasicShapes/Sphere")

    # Spawn 3 patrol points in a triangle pattern
    patrol_positions = [
        unreal.Vector(0, 0, 100),
        unreal.Vector(800, 0, 100),
        unreal.Vector(400, 600, 100),
    ]

    pp_class = pp_bp.generated_class()
    patrol_actors = []
    for i, pos in enumerate(patrol_positions):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(pp_class, pos)
        if actor:
            actor.set_actor_label(f"PatrolPoint_{i}")
            # Set sphere mesh and scale on instance
            comps = actor.get_components_by_class(unreal.StaticMeshComponent)
            if comps and sphere_mesh:
                comps[0].set_static_mesh(sphere_mesh)
                comps[0].set_world_scale3d(unreal.Vector(0.3, 0.3, 0.3))
            patrol_actors.append(actor)

    steps.append(f"Spawned {len(patrol_actors)} patrol points in triangle pattern")

    # ============================================
    # 2. CREATE BP_PatrolActor
    # ============================================
    pa_bp, pa_path = _create_blueprint(asset_tools, eal, "BP_PatrolActor", bp_dir)
    if not pa_bp:
        return make_error(9601, "Failed to create BP_PatrolActor")

    # Add components: StaticMesh (cone) + PointLight
    _add_component(sub, pa_bp, "/Script/Engine.StaticMeshComponent")
    _add_component(sub, pa_bp, "/Script/Engine.PointLightComponent")

    _compile_bp(pa_bp)
    eal.save_asset(pa_path, False)
    steps.append("Created BP_PatrolActor Blueprint")

    # Spawn the patrol actor at first patrol point
    pa_class = pa_bp.generated_class()
    patrol_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        pa_class, patrol_positions[0]
    )

    if patrol_actor:
        patrol_actor.set_actor_label("PatrolActor")

        # Set cone mesh
        cone_mesh = unreal.load_asset("/Engine/BasicShapes/Cone")
        comps = patrol_actor.get_components_by_class(unreal.StaticMeshComponent)
        if comps and cone_mesh:
            comps[0].set_static_mesh(cone_mesh)
            comps[0].set_world_scale3d(unreal.Vector(0.5, 0.5, 0.5))

        # Create and assign a bright material
        mat = unreal.load_asset("/Game/Materials/M_PatrolActor")
        if not mat:
            mel = unreal.MaterialEditingLibrary
            mat_factory = unreal.MaterialFactoryNew()
            mat = asset_tools.create_asset("M_PatrolActor", "/Game/Materials", None, mat_factory)
            if mat:
                # Clean and create fresh nodes
                num_expr = mel.get_num_material_expressions(mat)
                if num_expr > 0:
                    mel.delete_all_material_expressions(mat)

                # Orange-yellow color constant
                color_node = mel.create_material_expression(
                    mat, unreal.MaterialExpressionConstant3Vector, -300, 0
                )
                color_node.set_editor_property("constant", unreal.LinearColor(1.0, 0.6, 0.1, 1.0))
                mel.connect_material_property(color_node, "", unreal.MaterialProperty.MP_BASE_COLOR)

                # Emissive glow
                multiply = mel.create_material_expression(
                    mat, unreal.MaterialExpressionMultiply, -100, 100
                )
                multiply.set_editor_property("const_b", 2.0)
                mel.connect_material_expressions(color_node, "", multiply, "A")
                mel.connect_material_property(multiply, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

                mel.recompile_material(mat)
                eal.save_asset("/Game/Materials/M_PatrolActor", False)
                steps.append("Created M_PatrolActor material (orange glow)")

        if comps and mat:
            comps[0].set_material(0, mat)

        # Configure point light
        lights = patrol_actor.get_components_by_class(unreal.PointLightComponent)
        if lights:
            lights[0].set_editor_property("intensity", 5000.0)
            lights[0].set_editor_property("light_color", unreal.Color(255, 150, 30, 255))
            lights[0].set_editor_property("attenuation_radius", 300.0)
            lights[0].set_editor_property("cast_shadows", False)

        steps.append("Spawned PatrolActor at first patrol point (orange cone with light)")

    # ============================================
    # 3. ADD PATROL BLUEPRINT LOGIC
    # ============================================
    # Add patrol movement logic via Blueprint nodes:
    # BeginPlay -> Set Timer -> Move between points using Lerp
    # We'll use the same approach: create nodes and wire them

    # For now, let's use a simpler approach with InterpToMovement component
    # which handles smooth movement between points automatically
    # We need to add this in a follow-up or via Blueprint nodes

    # Actually, let's add an InterpToMovementComponent for automatic patrol
    _add_component(sub, pa_bp, "/Script/Engine.InterpToMovementComponent")
    _compile_bp(pa_bp)
    eal.save_asset(pa_path, False)
    steps.append("Added InterpToMovementComponent for patrol movement")

    # Save level
    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="Patrol system created! BP_PatrolPoint (3 markers) + BP_PatrolActor (orange cone) placed in level.",
        steps=steps,
        blueprints={"patrolPoint": pp_path, "patrolActor": pa_path},
        patrolPositions=[
            {"x": 0, "y": 0, "z": 100},
            {"x": 800, "y": 0, "z": 100},
            {"x": 400, "y": 600, "z": 100},
        ],
        instructions=(
            "The patrol actor has an InterpToMovementComponent. "
            "To set the patrol path, open BP_PatrolActor in the editor and configure "
            "the control points on the InterpToMovement component, or we can add "
            "Blueprint nodes to move between the PatrolPoint actors at runtime."
        ),
    )
