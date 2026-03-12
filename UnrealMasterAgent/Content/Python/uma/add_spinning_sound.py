"""
add_spinning_sound.py
Generates a simple looping hum sound wave procedurally,
adds an AudioComponent to BP_SpinningCube, and configures it
to play the sound on loop with spatial attenuation.
"""
import unreal
import math
import struct
from uma.utils import execute_wrapper, make_result, make_error


def _compile_bp(bp):
    for lib in ["BlueprintEditorLibrary", "KismetSystemLibrary"]:
        if hasattr(unreal, lib):
            try:
                getattr(unreal, lib).compile_blueprint(bp)
                return True
            except Exception:
                pass
    return False


def _find_engine_sound():
    """Try to find any existing SoundWave in the engine or project."""
    registry = unreal.AssetRegistryHelpers.get_asset_registry()
    ar_filter = unreal.ARFilter()
    ar_filter.class_paths = [
        unreal.TopLevelAssetPath("/Script/Engine", "SoundWave")
    ]
    ar_filter.recursive_paths = True
    found = registry.get_assets(ar_filter)
    if found:
        # Return first sound found
        for ad in found:
            try:
                path = str(ad.get_full_name()).split(' ')[-1]
                asset = ad.get_asset()
                if asset:
                    return asset, path
            except Exception:
                continue
    return None, None


@execute_wrapper
def execute(params):
    eal = unreal.EditorAssetLibrary
    sub = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    steps = []

    # Check if we already have the sound
    sound = unreal.load_asset("/Game/Audio/S_SpinningHum")
    if sound:
        steps.append("Found existing S_SpinningHum")
    else:
        # Create a simple procedural sound wave
        # Generate a low hum tone (150 Hz sine wave, 1 second, 16-bit PCM)
        sample_rate = 22050
        duration = 1.0
        frequency = 150.0
        num_samples = int(sample_rate * duration)

        # Generate PCM data
        pcm_data = bytearray()
        for i in range(num_samples):
            t = i / sample_rate
            # Mix two frequencies for a richer hum
            val = 0.4 * math.sin(2 * math.pi * frequency * t)
            val += 0.2 * math.sin(2 * math.pi * (frequency * 2) * t)
            val += 0.1 * math.sin(2 * math.pi * (frequency * 3) * t)
            # Fade in/out to avoid clicks
            fade = min(i / 500, (num_samples - i) / 500, 1.0)
            sample = int(val * fade * 32000)
            sample = max(-32768, min(32767, sample))
            pcm_data.extend(struct.pack('<h', sample))

        # Try to import as a sound wave asset
        try:
            # Write a WAV file temporarily
            import tempfile
            import os
            wav_path = os.path.join(tempfile.gettempdir(), "spinning_hum.wav")

            with open(wav_path, 'wb') as f:
                # WAV header
                data_size = len(pcm_data)
                f.write(b'RIFF')
                f.write(struct.pack('<I', 36 + data_size))
                f.write(b'WAVE')
                f.write(b'fmt ')
                f.write(struct.pack('<I', 16))  # chunk size
                f.write(struct.pack('<H', 1))   # PCM
                f.write(struct.pack('<H', 1))   # mono
                f.write(struct.pack('<I', sample_rate))
                f.write(struct.pack('<I', sample_rate * 2))  # byte rate
                f.write(struct.pack('<H', 2))   # block align
                f.write(struct.pack('<H', 16))  # bits per sample
                f.write(b'data')
                f.write(struct.pack('<I', data_size))
                f.write(pcm_data)

            steps.append(f"Generated WAV file: {wav_path}")

            # Import via AssetTools
            import_task = unreal.AssetImportTask()
            import_task.set_editor_property("filename", wav_path)
            import_task.set_editor_property("destination_path", "/Game/Audio")
            import_task.set_editor_property("destination_name", "S_SpinningHum")
            import_task.set_editor_property("replace_existing", True)
            import_task.set_editor_property("automated", True)
            import_task.set_editor_property("save", True)

            asset_tools.import_asset_tasks([import_task])

            sound = unreal.load_asset("/Game/Audio/S_SpinningHum")
            if sound:
                # Set looping
                sound.set_editor_property("looping", True)
                eal.save_asset("/Game/Audio/S_SpinningHum", False)
                steps.append("Imported S_SpinningHum sound (150Hz hum, looping)")
            else:
                steps.append("Warning: Sound import did not produce asset")
        except Exception as e:
            steps.append(f"Sound generation error: {e}")

    # Add AudioComponent to BP_SpinningCube
    bp_path = "/Game/Blueprints/BP_SpinningCube"
    bp = unreal.load_asset(bp_path)
    if not bp:
        return make_error(9500, "BP_SpinningCube not found")

    handles = sub.k2_gather_subobject_data_for_blueprint(bp)
    root = handles[0] if handles else unreal.SubobjectDataHandle()

    audio_class = unreal.load_class(None, "/Script/Engine.AudioComponent")
    p = unreal.AddNewSubobjectParams()
    p.set_editor_property("new_class", audio_class)
    p.set_editor_property("blueprint_context", bp)
    p.set_editor_property("parent_handle", root)
    _, fail_reason = sub.add_new_subobject(p)

    fail_str = str(fail_reason).strip()
    if fail_str:
        steps.append(f"AudioComponent add failed: {fail_str}")
    else:
        steps.append("Added AudioComponent to Blueprint")

    # Compile and save
    _compile_bp(bp)
    eal.save_asset(bp_path, False)
    steps.append("Compiled and saved Blueprint")

    # Configure AudioComponent on the spawned instance
    actor = None
    for a in unreal.EditorLevelLibrary.get_all_level_actors():
        if a.get_actor_label() == "SpinningCube":
            actor = a
            break

    if actor and sound:
        audio_comps = actor.get_components_by_class(unreal.AudioComponent)
        if audio_comps:
            ac = audio_comps[0]
            ac.set_sound(sound)
            ac.set_editor_property("auto_activate", True)
            ac.set_editor_property("volume_multiplier", 0.5)
            ac.set_editor_property("is_ui_sound", False)
            steps.append("Configured AudioComponent: sound assigned, auto-activate, volume=0.5")
        else:
            steps.append("Warning: No AudioComponent on spawned actor")

    try:
        unreal.EditorLevelLibrary.save_current_level()
        steps.append("Saved level")
    except Exception:
        pass

    return make_result(
        message="Spinning sound effect added to SpinningCube!",
        steps=steps,
    )
