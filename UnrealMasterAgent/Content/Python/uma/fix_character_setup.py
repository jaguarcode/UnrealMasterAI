"""
fix_character_setup.py
Fixes remaining setup issues:
1. Adds SpringArm + Camera to Character Blueprint via SCS
2. Compiles Blueprints
3. Sets GameMode default pawn
4. Sets World Settings game mode override
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    steps = []
    warnings = []

    char_bp_path = "/Game/Characters/BP_ThirdPersonCharacter"
    gm_bp_path = "/Game/GameMode/BP_ThirdPersonGameMode"

    char_bp = unreal.load_asset(char_bp_path)
    if not char_bp:
        return make_error(9200, "Character BP not found")

    # ==================================================
    # 1. ADD SPRINGARM + CAMERA VIA SCS
    # ==================================================
    try:
        scs = char_bp.simple_construction_script
        if scs:
            # Get all existing nodes to find root
            all_nodes = scs.get_all_nodes()

            # Create SpringArm node
            spring_arm_class = unreal.load_class(
                None, "/Script/Engine.SpringArmComponent"
            )
            camera_class = unreal.load_class(
                None, "/Script/Engine.CameraComponent"
            )

            if spring_arm_class and camera_class:
                # Create SpringArm node
                sa_node = unreal.SCS_Node.create_node(scs, spring_arm_class)
                if not sa_node:
                    sa_node = scs.create_node(spring_arm_class)

                if sa_node:
                    # Configure SpringArm template
                    sa_comp = sa_node.component_template
                    if sa_comp:
                        sa_comp.set_editor_property(
                            "target_arm_length", 400.0
                        )
                        sa_comp.set_editor_property(
                            "use_pawn_control_rotation", True
                        )
                        sa_comp.set_editor_property(
                            "relative_location", unreal.Vector(0, 0, 60)
                        )

                    # Attach to default scene root
                    scs.add_node(sa_node)

                    # Create Camera node
                    cam_node = scs.create_node(camera_class)
                    if cam_node:
                        cam_comp = cam_node.component_template
                        if cam_comp:
                            cam_comp.set_editor_property("auto_activate", True)
                        # Attach camera to spring arm
                        sa_node.add_child_node(cam_node)

                    steps.append("Added SpringArm + Camera via SCS")
                else:
                    warnings.append("SCS create_node returned None")
            else:
                warnings.append("Could not load SpringArm/Camera classes")
        else:
            warnings.append("No SCS on character blueprint")
    except Exception as e:
        warnings.append(f"SCS component add: {e}")

    # ==================================================
    # 2. COMPILE CHARACTER BLUEPRINT
    # ==================================================
    compiled = False
    compile_methods = [
        ("KismetSystemLibrary", lambda: unreal.KismetSystemLibrary.compile_blueprint(char_bp)),
        ("BlueprintEditorLibrary", lambda: unreal.BlueprintEditorLibrary.compile_blueprint(char_bp)),
        ("EditorAssetSubsystem", lambda: unreal.get_engine_subsystem(unreal.EditorAssetSubsystem).save_asset(char_bp_path)),
    ]
    for name, fn in compile_methods:
        try:
            fn()
            steps.append(f"Compiled character BP via {name}")
            compiled = True
            break
        except Exception:
            continue

    if not compiled:
        # Fallback: just save the asset to trigger compilation
        try:
            eal.save_asset(char_bp_path, False)
            steps.append("Saved character BP (fallback compile)")
        except Exception as e:
            warnings.append(f"Could not compile/save character BP: {e}")

    # ==================================================
    # 3. SET GAMEMODE DEFAULT PAWN
    # ==================================================
    gm_bp = unreal.load_asset(gm_bp_path)
    if gm_bp:
        try:
            gm_cdo = unreal.get_default_object(gm_bp.generated_class())
            char_class = char_bp.generated_class()
            if gm_cdo and char_class:
                gm_cdo.set_editor_property("default_pawn_class", char_class)
                steps.append("Set default pawn class on GameMode")
        except Exception as e:
            warnings.append(f"GameMode default pawn: {e}")

        # Compile GameMode
        for name, fn in [
            ("KismetSystemLibrary", lambda: unreal.KismetSystemLibrary.compile_blueprint(gm_bp)),
            ("BlueprintEditorLibrary", lambda: unreal.BlueprintEditorLibrary.compile_blueprint(gm_bp)),
        ]:
            try:
                fn()
                steps.append(f"Compiled GameMode BP via {name}")
                break
            except Exception:
                continue
        try:
            eal.save_asset(gm_bp_path, False)
        except Exception:
            pass
    else:
        warnings.append("GameMode BP not found")

    # ==================================================
    # 4. SET WORLD SETTINGS GAME MODE
    # ==================================================
    if gm_bp:
        try:
            world = unreal.EditorLevelLibrary.get_editor_world()
            ws = world.get_world_settings() if world else None
            if ws:
                gm_class = gm_bp.generated_class()
                # Try different property names
                for prop_name in [
                    "game_mode_override",
                    "default_game_mode",
                    "game_mode",
                    "game_mode_class",
                ]:
                    try:
                        ws.set_editor_property(prop_name, gm_class)
                        steps.append(
                            f"Set World Settings GameMode via '{prop_name}'"
                        )
                        break
                    except Exception:
                        continue
                else:
                    # List available properties for debugging
                    warnings.append(
                        "Could not set GameMode on World Settings. "
                        "Set it manually: World Settings > Game Mode Override"
                    )
        except Exception as e:
            warnings.append(f"World Settings: {e}")

    # ==================================================
    # 5. SAVE LEVEL
    # ==================================================
    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="Character setup fixes applied",
        steps=steps,
        warnings=warnings,
    )
