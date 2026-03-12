"""
setup_playable_level.py
Creates a complete playable third-person level:
1. Wide floor (20000x20000 units)
2. Third-person Character Blueprint with SpringArm + Camera
3. Mannequin skeletal mesh assignment (if available)
4. GameMode Blueprint (default pawn = our character)
5. PlayerStart at center
6. Save all assets and level
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


def _add_component_to_blueprint(bp, comp_class_path, comp_name, parent_handle=None):
    """Add a component to a Blueprint using SubobjectDataSubsystem."""
    subsystem = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    handles = subsystem.k2_gather_subobject_data_for_blueprint(bp)
    root = parent_handle if parent_handle else (handles[0] if handles else unreal.SubobjectDataHandle())

    comp_class = unreal.load_class(None, comp_class_path)
    if comp_class is None:
        return None, None, f"Class not found: {comp_class_path}"

    params_obj = unreal.AddNewSubobjectParams()
    params_obj.set_editor_property("new_class", comp_class)
    params_obj.set_editor_property("blueprint_context", bp)
    params_obj.set_editor_property("parent_handle", root)

    result_handle, fail_reason = subsystem.add_new_subobject(params_obj)

    if fail_reason:
        return None, None, f"Failed to add {comp_name}: {fail_reason}"

    data = subsystem.find_subobject_data_from_handle(result_handle)
    comp = data.get_object() if data else None
    if comp and hasattr(comp, "rename"):
        comp.rename(comp_name)

    return comp, result_handle, None


@execute_wrapper
def execute(params):
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    eal = unreal.EditorAssetLibrary
    steps = []
    warnings = []

    # ==================================================
    # 1. CREATE WIDE FLOOR
    # ==================================================
    cube_mesh = unreal.load_asset("/Engine/BasicShapes/Cube")
    if not cube_mesh:
        return make_error(9100, "Engine Cube mesh not found")

    # Create a simple floor material
    floor_mat = None
    if not eal.does_asset_exist("/Game/Materials/M_FloorGrid"):
        mat_factory = unreal.MaterialFactoryNew()
        floor_mat = asset_tools.create_asset(
            "M_FloorGrid", "/Game/Materials", None, mat_factory
        )
        if floor_mat:
            steps.append("Created floor material M_FloorGrid")
    else:
        floor_mat = unreal.load_asset("/Game/Materials/M_FloorGrid")

    # Spawn floor actor - Cube scaled to 20000x20000x100
    floor_class = unreal.load_class(None, "/Script/Engine.StaticMeshActor")
    floor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        floor_class, unreal.Vector(0, 0, -50)
    )
    if floor:
        floor.set_actor_label("Floor")
        smc = floor.static_mesh_component
        smc.set_static_mesh(cube_mesh)
        smc.set_world_scale3d(unreal.Vector(200, 200, 1))
        if floor_mat:
            smc.set_material(0, floor_mat)
        steps.append("Spawned 20000x20000 floor at origin")
    else:
        return make_error(9101, "Failed to spawn floor actor")

    # ==================================================
    # 2. SEARCH FOR MANNEQUIN SKELETAL MESH
    # ==================================================
    mannequin_search_paths = [
        "/Game/Characters/Mannequins/Meshes/SKM_Manny",
        "/Game/Characters/Mannequins/Meshes/SKM_Quinn",
        "/Game/Mannequin/Character/Mesh/SK_Mannequin",
        "/Engine/Tutorial/SubEditors/TutorialAssets/Character/TutorialTPP",
        "/Engine/EngineMeshes/SKM_Manny",
    ]

    skeletal_mesh = None
    mesh_path_found = None
    skeleton_asset = None

    for path in mannequin_search_paths:
        asset = unreal.load_asset(path)
        if asset and isinstance(asset, unreal.SkeletalMesh):
            skeletal_mesh = asset
            mesh_path_found = path
            break

    # Broader search: find ANY SkeletalMesh via asset registry
    if not skeletal_mesh:
        try:
            registry = unreal.AssetRegistryHelpers.get_asset_registry()
            ar_filter = unreal.ARFilter()
            ar_filter.class_paths = [
                unreal.TopLevelAssetPath("/Script/Engine", "SkeletalMesh")
            ]
            ar_filter.recursive_paths = True
            found_assets = registry.get_assets(ar_filter)
            if found_assets:
                for ad in found_assets:
                    loaded = ad.get_asset()
                    if loaded and isinstance(loaded, unreal.SkeletalMesh):
                        skeletal_mesh = loaded
                        mesh_path_found = str(ad.package_name)
                        break
        except Exception:
            pass

    if skeletal_mesh:
        steps.append(f"Found skeletal mesh: {mesh_path_found}")
        try:
            skeleton_asset = skeletal_mesh.get_editor_property("skeleton")
        except Exception:
            pass
    else:
        warnings.append(
            "No skeletal mesh found. Character will use capsule representation. "
            "Enable the Mannequins plugin in Edit > Plugins for the UE5 mannequin."
        )

    # ==================================================
    # 3. CREATE CHARACTER BLUEPRINT
    # ==================================================
    char_bp_path = "/Game/Characters"
    char_bp_name = "BP_ThirdPersonCharacter"
    char_full = f"{char_bp_path}/{char_bp_name}"

    if eal.does_asset_exist(char_full):
        eal.delete_asset(char_full)

    char_factory = unreal.BlueprintFactory()
    char_factory.set_editor_property("parent_class", unreal.Character)

    char_bp = asset_tools.create_asset(
        char_bp_name, char_bp_path, unreal.Blueprint, char_factory
    )
    if not char_bp:
        return make_error(9102, "Failed to create Character Blueprint")
    steps.append("Created BP_ThirdPersonCharacter")

    # Get CDO for property configuration
    gen_class = char_bp.generated_class()
    cdo = unreal.get_default_object(gen_class)

    # Assign skeletal mesh if found
    if skeletal_mesh and cdo:
        try:
            mesh_comp = cdo.get_component_by_class(unreal.SkeletalMeshComponent)
            if mesh_comp:
                mesh_comp.set_skeletal_mesh_asset(skeletal_mesh)
                mesh_comp.set_editor_property(
                    "relative_location", unreal.Vector(0, 0, -90)
                )
                mesh_comp.set_editor_property(
                    "relative_rotation", unreal.Rotator(0, -90, 0)
                )
                steps.append("Assigned skeletal mesh to character")
        except Exception as e:
            warnings.append(f"Could not assign skeletal mesh: {e}")

    # Configure CharacterMovement defaults
    if cdo:
        try:
            move_comp = cdo.get_component_by_class(
                unreal.CharacterMovementComponent
            )
            if move_comp:
                move_comp.set_editor_property("max_walk_speed", 600.0)
                move_comp.set_editor_property("max_walk_speed_crouched", 300.0)
                move_comp.set_editor_property("jump_z_velocity", 700.0)
                move_comp.set_editor_property("air_control", 0.35)
                move_comp.set_editor_property(
                    "rotation_rate", unreal.Rotator(0, 500, 0)
                )
                move_comp.set_editor_property(
                    "orient_rotation_to_movement", True
                )
                steps.append("Configured CharacterMovement (walk=600, jump=700)")
        except Exception as e:
            warnings.append(f"Could not configure CharacterMovement: {e}")

        # Disable controller rotation on pawn (let movement orient)
        try:
            cdo.set_editor_property("use_controller_rotation_yaw", False)
            cdo.set_editor_property("use_controller_rotation_pitch", False)
            cdo.set_editor_property("use_controller_rotation_roll", False)
        except Exception:
            pass

    # Add SpringArm + Camera via SubobjectDataSubsystem
    spring_arm_comp, spring_arm_handle, err = _add_component_to_blueprint(
        char_bp, "/Script/Engine.SpringArmComponent", "SpringArm"
    )
    if spring_arm_comp:
        try:
            spring_arm_comp.set_editor_property("target_arm_length", 400.0)
            spring_arm_comp.set_editor_property(
                "use_pawn_control_rotation", True
            )
            spring_arm_comp.set_editor_property(
                "relative_location", unreal.Vector(0, 0, 60)
            )
        except Exception as e:
            warnings.append(f"SpringArm property set: {e}")

        # Camera as child of SpringArm
        camera_comp, camera_handle, cam_err = _add_component_to_blueprint(
            char_bp,
            "/Script/Engine.CameraComponent",
            "FollowCamera",
            parent_handle=spring_arm_handle,
        )
        if camera_comp:
            steps.append("Added SpringArm (400cm) + FollowCamera components")
        else:
            warnings.append(f"Camera: {cam_err}")
    else:
        warnings.append(f"SpringArm: {err}")

    # Compile the Character Blueprint
    try:
        unreal.KismetSystemLibrary.compile_blueprint(char_bp)
        eal.save_asset(char_full, False)
        steps.append("Compiled Character Blueprint")
    except Exception as e:
        warnings.append(f"Blueprint compile: {e}")

    # ==================================================
    # 4. CREATE ANIMATION BLUEPRINT (if skeleton found)
    # ==================================================
    if skeleton_asset:
        try:
            anim_bp_name = "ABP_ThirdPersonCharacter"
            anim_full = f"{char_bp_path}/{anim_bp_name}"
            if eal.does_asset_exist(anim_full):
                eal.delete_asset(anim_full)

            anim_factory = unreal.AnimBlueprintFactory()
            anim_factory.set_editor_property("target_skeleton", skeleton_asset)

            anim_bp = asset_tools.create_asset(
                anim_bp_name, char_bp_path, unreal.AnimBlueprint, anim_factory
            )
            if anim_bp:
                steps.append("Created ABP_ThirdPersonCharacter")
                try:
                    mesh_comp = cdo.get_component_by_class(
                        unreal.SkeletalMeshComponent
                    )
                    if mesh_comp:
                        mesh_comp.set_editor_property(
                            "anim_class", anim_bp.generated_class()
                        )
                        steps.append("Assigned AnimBlueprint to character mesh")
                except Exception as e:
                    warnings.append(f"AnimBP assignment: {e}")
        except Exception as e:
            warnings.append(f"AnimBlueprint creation: {e}")

    # ==================================================
    # 5. CREATE GAMEMODE BLUEPRINT
    # ==================================================
    gm_path = "/Game/GameMode"
    gm_name = "BP_ThirdPersonGameMode"
    gm_full = f"{gm_path}/{gm_name}"

    if eal.does_asset_exist(gm_full):
        eal.delete_asset(gm_full)

    gm_factory = unreal.BlueprintFactory()
    gm_factory.set_editor_property("parent_class", unreal.GameModeBase)

    gm_bp = asset_tools.create_asset(
        gm_name, gm_path, unreal.Blueprint, gm_factory
    )
    if gm_bp:
        try:
            gm_cdo = unreal.get_default_object(gm_bp.generated_class())
            if gm_cdo:
                gm_cdo.set_editor_property("default_pawn_class", gen_class)
            unreal.KismetSystemLibrary.compile_blueprint(gm_bp)
            eal.save_asset(gm_full, False)
            steps.append(
                "Created BP_ThirdPersonGameMode with character as default pawn"
            )
        except Exception as e:
            warnings.append(f"GameMode config: {e}")
    else:
        warnings.append("Failed to create GameMode Blueprint")

    # ==================================================
    # 6. SET GAMEMODE ON WORLD SETTINGS
    # ==================================================
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world:
            ws = world.get_world_settings()
            if ws and gm_bp:
                ws.set_editor_property(
                    "game_mode_override", gm_bp.generated_class()
                )
                steps.append("Set GameMode override on World Settings")
    except Exception as e:
        warnings.append(f"World Settings GameMode: {e}")

    # ==================================================
    # 7. SPAWN PLAYERSTART
    # ==================================================
    ps_class = unreal.load_class(None, "/Script/Engine.PlayerStart")
    if ps_class:
        player_start = unreal.EditorLevelLibrary.spawn_actor_from_class(
            ps_class, unreal.Vector(0, 0, 100)
        )
        if player_start:
            player_start.set_actor_label("PlayerStart_Center")
            steps.append("Spawned PlayerStart at level center")
    else:
        warnings.append("Could not find PlayerStart class")

    # ==================================================
    # 8. SAVE ALL
    # ==================================================
    try:
        eal.save_directory("/Game/Characters")
        eal.save_directory("/Game/GameMode")
        eal.save_directory("/Game/Materials")
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved all assets and level")
    except Exception as e:
        warnings.append(f"Save: {e}")

    return make_result(
        message="Playable third-person level created",
        steps=steps,
        warnings=warnings,
        mannequinFound=skeletal_mesh is not None,
        characterBP=char_full,
        gameModeBP=gm_full,
        instructions=(
            "Press Play in the editor to test. "
            "WASD to move, mouse to look. "
            "If no mannequin mesh is visible, enable the Mannequins plugin "
            "via Edit > Plugins, restart, and re-run this script."
        ),
    )
