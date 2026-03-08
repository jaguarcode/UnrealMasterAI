"""
test_actor_spawn.py - Tests for uma/actor_spawn.py.

The mock unreal module is injected by conftest.py before this module loads.
"""
import json
import sys
import unittest.mock as mock
import pytest

# Import after conftest has patched sys.modules["unreal"]
from uma import actor_spawn


def _call(params: dict) -> dict:
    """Helper: serialise params, call execute, return parsed result dict."""
    raw = actor_spawn.execute(json.dumps(params))
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Success paths
# ---------------------------------------------------------------------------

def test_spawn_success():
    """load_class returns a class; spawn_actor_from_class returns a mock actor."""
    unreal = sys.modules["unreal"]
    # load_class already returns _default_mock_class by default
    actor = unreal._make_mock_actor("SpawnedActor")
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = actor

    result = _call({"className": "/Script/Engine.StaticMeshActor"})

    assert result["success"] is True
    assert result["actorName"] == "SpawnedActor"
    assert result["className"] == "/Script/Engine.StaticMeshActor"


def test_spawn_with_location_rotation():
    """Location and rotation dicts are forwarded correctly."""
    unreal = sys.modules["unreal"]
    actor = unreal._make_mock_actor("LocRotActor")
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = actor

    result = _call({
        "className": "/Script/Engine.Actor",
        "location": {"x": 100, "y": 200, "z": 300},
        "rotation": {"pitch": 10, "yaw": 20, "roll": 30},
    })

    assert result["success"] is True
    assert result["location"] == {"x": 100.0, "y": 200.0, "z": 300.0}
    assert result["rotation"] == {"pitch": 10.0, "yaw": 20.0, "roll": 30.0}

    call_args = unreal.EditorLevelLibrary.spawn_actor_from_class.call_args
    loc_arg = call_args[0][1]  # positional arg index 1 = location
    rot_arg = call_args[0][2]  # positional arg index 2 = rotation
    assert loc_arg.x == 100.0 and loc_arg.y == 200.0 and loc_arg.z == 300.0
    assert rot_arg.pitch == 10.0 and rot_arg.yaw == 20.0 and rot_arg.roll == 30.0


def test_spawn_with_label():
    """Optional label param calls set_actor_label on the spawned actor."""
    unreal = sys.modules["unreal"]
    actor = unreal._make_mock_actor("DefaultLabel")
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = actor

    _call({"className": "/Script/Engine.Actor", "label": "MyLabel"})

    actor.set_actor_label.assert_called_once_with("MyLabel")


def test_spawn_default_location_is_origin():
    """When no location/rotation provided, defaults to (0,0,0) / (0,0,0)."""
    unreal = sys.modules["unreal"]
    actor = unreal._make_mock_actor()
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = actor

    result = _call({"className": "/Script/Engine.Actor"})

    assert result["success"] is True
    assert result["location"] == {"x": 0.0, "y": 0.0, "z": 0.0}
    assert result["rotation"] == {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}


# ---------------------------------------------------------------------------
# Failure paths
# ---------------------------------------------------------------------------

def test_spawn_class_not_found_returns_error_5102():
    """When load_class always returns None, expect error code 5102."""
    unreal = sys.modules["unreal"]
    # Override load_class to always return None
    unreal.load_class = lambda outer, path: None
    # Also make load_asset return None so blueprint path also fails
    unreal.EditorAssetLibrary.load_asset.return_value = None

    result = _call({"className": "NonExistentClass"})

    assert result["success"] is False
    assert result["error"]["code"] == 5102
    assert "NonExistentClass" in result["error"]["message"]


def test_spawn_missing_classname_returns_error_5102():
    """Missing required className param → ValueError → error code 5102."""
    result = _call({})

    assert result["success"] is False
    assert result["error"]["code"] == 5102
    assert "className" in result["error"]["message"]


def test_spawn_actor_none_returns_error_5101():
    """spawn_actor_from_class returning None → error code 5101."""
    unreal = sys.modules["unreal"]
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = None

    result = _call({"className": "/Script/Engine.Actor"})

    assert result["success"] is False
    assert result["error"]["code"] == 5101


def test_spawn_blueprint_path_uses_load_asset():
    """A path starting with / triggers EditorAssetLibrary.load_asset."""
    unreal = sys.modules["unreal"]
    actor = unreal._make_mock_actor("BPActor")
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = actor

    _call({"className": "/Game/Blueprints/BP_MyActor"})

    unreal.EditorAssetLibrary.load_asset.assert_called_once_with(
        "/Game/Blueprints/BP_MyActor"
    )
