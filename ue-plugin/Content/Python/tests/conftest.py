"""
conftest.py - Pytest configuration and shared fixtures.

Injects a mock `unreal` module into sys.modules before any uma script imports
run, so scripts that do `import unreal` at module level get the mock instead
of failing with ModuleNotFoundError.
"""
import sys
import json
import types
import unittest.mock as mock
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the uma package is importable from the Python root
# ---------------------------------------------------------------------------
PYTHON_ROOT = Path(__file__).parent.parent  # ue-plugin/Content/Python/
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))


# ---------------------------------------------------------------------------
# Build the mock unreal module
# ---------------------------------------------------------------------------

def _build_mock_unreal():
    """Construct and return a types.ModuleType that mimics the unreal module."""

    unreal = types.ModuleType("unreal")

    # -- Basic value types --------------------------------------------------

    class Vector:
        def __init__(self, x=0.0, y=0.0, z=0.0):
            self.x = float(x)
            self.y = float(y)
            self.z = float(z)

        def __repr__(self):
            return f"Vector({self.x}, {self.y}, {self.z})"

    class Rotator:
        def __init__(self, pitch=0.0, yaw=0.0, roll=0.0):
            self.pitch = float(pitch)
            self.yaw = float(yaw)
            self.roll = float(roll)

        def __repr__(self):
            return f"Rotator({self.pitch}, {self.yaw}, {self.roll})"

    unreal.Vector = Vector
    unreal.Rotator = Rotator

    # -- Mock actor returned from spawn_actor_from_class --------------------

    def _make_mock_actor(label="MockActor"):
        actor = mock.MagicMock()
        actor.get_actor_label.return_value = label
        actor.set_actor_label = mock.MagicMock()
        return actor

    unreal._make_mock_actor = _make_mock_actor  # expose for tests

    # -- EditorAssetLibrary -------------------------------------------------

    mock_asset = mock.MagicMock()
    mock_asset.get_path_name.return_value = "/Game/MockAsset.MockAsset"
    mock_asset.get_class.return_value = mock.MagicMock()
    # generated_class not present by default so hasattr returns False
    del mock_asset.generated_class

    eal = mock.MagicMock()
    eal.load_asset.return_value = mock_asset
    eal.does_asset_exist.return_value = True
    eal.make_directory.return_value = True
    eal.save_asset.return_value = True
    eal.save_loaded_asset.return_value = None
    unreal.EditorAssetLibrary = eal

    # -- EditorLevelLibrary -------------------------------------------------

    ell = mock.MagicMock()
    ell.spawn_actor_from_class.return_value = _make_mock_actor()
    ell.get_all_level_actors.return_value = []
    ell.load_level.return_value = True
    ell.new_level.return_value = True
    ell.new_level_from_template.return_value = True
    unreal.EditorLevelLibrary = ell

    # -- AssetToolsHelpers --------------------------------------------------

    mock_new_asset = mock.MagicMock()
    mock_new_asset.get_path_name.return_value = "/Game/NewAsset.NewAsset"

    mock_asset_tools = mock.MagicMock()
    mock_asset_tools.create_asset.return_value = mock_new_asset
    mock_asset_tools.list_asset_factories.return_value = []

    ath = mock.MagicMock()
    ath.get_asset_tools.return_value = mock_asset_tools
    unreal.AssetToolsHelpers = ath

    # -- load_class ---------------------------------------------------------

    _default_mock_class = mock.MagicMock()

    def load_class(outer, class_path):
        """Return a mock class for any path, None to simulate not found."""
        return _default_mock_class

    unreal.load_class = load_class
    unreal._default_mock_class = _default_mock_class  # expose for override

    # -- SystemLibrary ------------------------------------------------------

    sl = mock.MagicMock()
    sl.get_project_name.return_value = "TestProject"
    unreal.SystemLibrary = sl

    # -- Factory stubs ------------------------------------------------------

    unreal.MaterialFactoryNew = mock.MagicMock(return_value=mock.MagicMock())
    unreal.WorldFactory = mock.MagicMock(return_value=mock.MagicMock())
    unreal.LevelSequenceFactoryNew = mock.MagicMock(return_value=mock.MagicMock())
    unreal.BlueprintFactory = mock.MagicMock(return_value=mock.MagicMock())

    # -- BlueprintGeneratedClass --------------------------------------------

    bgc = mock.MagicMock()
    bgc.cast.return_value = None  # default: not a blueprint
    unreal.BlueprintGeneratedClass = bgc

    return unreal


# Inject BEFORE any uma module is imported (module-level execution).
_mock_unreal = _build_mock_unreal()
sys.modules["unreal"] = _mock_unreal


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------

import pytest  # noqa: E402  (import after sys.modules patch)


@pytest.fixture(autouse=True)
def reset_unreal_mocks():
    """Reset all mock call counts before each test to keep tests independent."""
    ell = sys.modules["unreal"].EditorLevelLibrary
    eal = sys.modules["unreal"].EditorAssetLibrary
    ath = sys.modules["unreal"].AssetToolsHelpers

    # Reset call history but preserve return_value / side_effect config
    ell.reset_mock(return_value=False, side_effect=False)
    eal.reset_mock(return_value=False, side_effect=False)
    ath.reset_mock(return_value=False, side_effect=False)

    # Restore sensible defaults that tests may have overridden
    unreal = sys.modules["unreal"]
    unreal.EditorLevelLibrary.spawn_actor_from_class.return_value = (
        unreal._make_mock_actor()
    )
    unreal.EditorLevelLibrary.new_level.return_value = True
    unreal.EditorLevelLibrary.new_level_from_template.return_value = True
    unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = (
        mock.MagicMock(**{"get_path_name.return_value": "/Game/NewAsset.NewAsset"})
    )
    unreal.AssetToolsHelpers.get_asset_tools.return_value.list_asset_factories.return_value = []
    unreal.load_class = lambda outer, path: unreal._default_mock_class

    yield
