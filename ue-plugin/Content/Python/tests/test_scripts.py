"""
test_scripts.py - Smoke tests for material_create, level_create, asset_create.

Each script is tested for:
- Success case (all required params provided, mocks return valid objects)
- Missing required parameter (expect error code 5102)
"""
import json
import sys
import unittest.mock as mock
import pytest

from uma import material_create, level_create, asset_create


def _call(module, params: dict) -> dict:
    raw = module.execute(json.dumps(params))
    return json.loads(raw)


# ===========================================================================
# material_create.py
# ===========================================================================

class TestMaterialCreate:

    def test_success(self):
        unreal = sys.modules["unreal"]
        mock_asset = mock.MagicMock()
        mock_asset.get_path_name.return_value = "/Game/Materials/M_Test.M_Test"
        unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = (
            mock_asset
        )

        result = _call(material_create, {
            "materialName": "M_Test",
            "materialPath": "/Game/Materials",
        })

        assert result["success"] is True
        assert result["materialName"] == "M_Test"
        assert result["materialPath"] == "/Game/Materials"
        assert result["objectPath"] == "/Game/Materials/M_Test.M_Test"

    def test_success_with_material_type(self):
        unreal = sys.modules["unreal"]
        mock_asset = mock.MagicMock()
        mock_asset.get_path_name.return_value = "/Game/Materials/M_Inst.M_Inst"
        unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = (
            mock_asset
        )

        result = _call(material_create, {
            "materialName": "M_Inst",
            "materialPath": "/Game/Materials",
            "materialType": "MaterialInstanceConstant",
        })

        assert result["success"] is True
        assert result["materialType"] == "MaterialInstanceConstant"

    def test_missing_material_name(self):
        result = _call(material_create, {"materialPath": "/Game/Materials"})
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "materialName" in result["error"]["message"]

    def test_missing_material_path(self):
        result = _call(material_create, {"materialName": "M_Test"})
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "materialPath" in result["error"]["message"]

    def test_invalid_path_returns_error(self):
        result = _call(material_create, {
            "materialName": "M_Test",
            "materialPath": "/Invalid/Root",
        })
        assert result["success"] is False
        assert result["error"]["code"] == 5102

    def test_create_asset_returns_none(self):
        unreal = sys.modules["unreal"]
        unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = None

        result = _call(material_create, {
            "materialName": "M_Fail",
            "materialPath": "/Game/Materials",
        })

        assert result["success"] is False
        assert result["error"]["code"] == 5101

    def test_calls_create_asset(self):
        unreal = sys.modules["unreal"]
        mock_asset = mock.MagicMock()
        mock_asset.get_path_name.return_value = "/Game/Materials/M_Check.M_Check"
        mock_tools = unreal.AssetToolsHelpers.get_asset_tools.return_value
        mock_tools.create_asset.return_value = mock_asset

        _call(material_create, {
            "materialName": "M_Check",
            "materialPath": "/Game/Materials",
        })

        mock_tools.create_asset.assert_called_once_with(
            "M_Check", "/Game/Materials", None, mock.ANY
        )


# ===========================================================================
# level_create.py
# ===========================================================================

class TestLevelCreate:

    def test_success_no_template(self):
        unreal = sys.modules["unreal"]
        unreal.EditorLevelLibrary.new_level.return_value = True

        result = _call(level_create, {"levelName": "MyNewLevel"})

        assert result["success"] is True
        assert result["levelName"] == "MyNewLevel"
        assert result["created"] is True
        assert result["templatePath"] is None

    def test_success_with_template(self):
        unreal = sys.modules["unreal"]
        unreal.EditorLevelLibrary.new_level_from_template.return_value = True

        result = _call(level_create, {
            "levelName": "TemplatedLevel",
            "templatePath": "/Game/Templates/BaseTemplate",
        })

        assert result["success"] is True
        assert result["levelName"] == "TemplatedLevel"
        assert result["templatePath"] == "/Game/Templates/BaseTemplate"
        unreal.EditorLevelLibrary.new_level_from_template.assert_called_once_with(
            "TemplatedLevel", "/Game/Templates/BaseTemplate"
        )

    def test_no_template_calls_new_level(self):
        unreal = sys.modules["unreal"]
        unreal.EditorLevelLibrary.new_level.return_value = True

        _call(level_create, {"levelName": "Plain"})

        unreal.EditorLevelLibrary.new_level.assert_called_once_with("Plain")

    def test_missing_level_name(self):
        result = _call(level_create, {})
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "levelName" in result["error"]["message"]

    def test_new_level_returns_false(self):
        unreal = sys.modules["unreal"]
        unreal.EditorLevelLibrary.new_level.return_value = False

        result = _call(level_create, {"levelName": "BadLevel"})

        assert result["success"] is False
        assert result["error"]["code"] == 5101
        assert "BadLevel" in result["error"]["message"]

    def test_new_level_from_template_returns_false(self):
        unreal = sys.modules["unreal"]
        unreal.EditorLevelLibrary.new_level_from_template.return_value = False

        result = _call(level_create, {
            "levelName": "BadLevel",
            "templatePath": "/Game/Templates/T",
        })

        assert result["success"] is False
        assert result["error"]["code"] == 5101


# ===========================================================================
# asset_create.py
# ===========================================================================

class TestAssetCreate:

    def _setup_factory(self, factory_class_name="MaterialFactoryNew"):
        """Inject a matching factory into list_asset_factories."""
        unreal = sys.modules["unreal"]
        factory_mock = mock.MagicMock()
        factory_mock.__class__ = type(factory_class_name, (), {})
        # Make __class__.__name__ match
        factory_mock.__class__.__name__ = factory_class_name
        unreal.AssetToolsHelpers.get_asset_tools.return_value.list_asset_factories.return_value = [
            factory_mock
        ]
        return factory_mock

    def test_success(self):
        unreal = sys.modules["unreal"]
        self._setup_factory("MaterialFactoryNew")
        mock_asset = mock.MagicMock()
        mock_asset.get_path_name.return_value = "/Game/Mats/M_New.M_New"
        unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = (
            mock_asset
        )

        result = _call(asset_create, {
            "assetName": "M_New",
            "assetPath": "/Game/Mats",
            "assetType": "MaterialFactoryNew",
        })

        assert result["success"] is True
        assert result["assetName"] == "M_New"
        assert result["assetPath"] == "/Game/Mats"
        assert result["assetType"] == "MaterialFactoryNew"
        assert result["objectPath"] == "/Game/Mats/M_New.M_New"

    def test_missing_asset_name(self):
        result = _call(asset_create, {
            "assetPath": "/Game/Mats",
            "assetType": "SomeFactory",
        })
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "assetName" in result["error"]["message"]

    def test_missing_asset_path(self):
        result = _call(asset_create, {
            "assetName": "MyAsset",
            "assetType": "SomeFactory",
        })
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "assetPath" in result["error"]["message"]

    def test_missing_asset_type(self):
        result = _call(asset_create, {
            "assetName": "MyAsset",
            "assetPath": "/Game/Stuff",
        })
        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "assetType" in result["error"]["message"]

    def test_unknown_factory_returns_error_5102(self):
        """No matching factory → error 5102."""
        unreal = sys.modules["unreal"]
        unreal.AssetToolsHelpers.get_asset_tools.return_value.list_asset_factories.return_value = []

        result = _call(asset_create, {
            "assetName": "X",
            "assetPath": "/Game/Stuff",
            "assetType": "NonExistentFactory",
        })

        assert result["success"] is False
        assert result["error"]["code"] == 5102
        assert "NonExistentFactory" in result["error"]["message"]

    def test_invalid_path_returns_error(self):
        result = _call(asset_create, {
            "assetName": "X",
            "assetPath": "/BadRoot/Path",
            "assetType": "SomeFactory",
        })
        assert result["success"] is False
        assert result["error"]["code"] == 5102

    def test_create_asset_returns_none(self):
        self._setup_factory("MaterialFactoryNew")
        unreal = sys.modules["unreal"]
        unreal.AssetToolsHelpers.get_asset_tools.return_value.create_asset.return_value = None

        result = _call(asset_create, {
            "assetName": "Fail",
            "assetPath": "/Game/Mats",
            "assetType": "MaterialFactoryNew",
        })

        assert result["success"] is False
        assert result["error"]["code"] == 5101
