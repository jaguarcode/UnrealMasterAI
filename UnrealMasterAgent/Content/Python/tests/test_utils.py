"""
test_utils.py - Unit tests for uma/utils.py utility functions.

conftest.py handles sys.modules injection so `import unreal` never fires here.
"""
import json
import sys
import pytest

# uma must be importable after conftest sets up sys.path
from uma.utils import (
    make_result,
    make_error,
    validate_path,
    parse_params,
    get_required_param,
    get_optional_param,
    execute_wrapper,
)


# ---------------------------------------------------------------------------
# make_result
# ---------------------------------------------------------------------------

def test_make_result_returns_success_true():
    result = make_result(key="val")
    assert result == {"success": True, "key": "val"}


def test_make_result_no_extra_kwargs():
    result = make_result()
    assert result == {"success": True}


# ---------------------------------------------------------------------------
# make_error
# ---------------------------------------------------------------------------

def test_make_error_returns_structured_error():
    result = make_error(123, "msg")
    assert result == {"success": False, "error": {"code": 123, "message": "msg"}}


def test_make_error_includes_extra_kwargs():
    result = make_error(999, "oops", detail="extra")
    assert result["error"]["detail"] == "extra"
    assert result["success"] is False


# ---------------------------------------------------------------------------
# validate_path
# ---------------------------------------------------------------------------

def test_validate_path_accepts_game_path():
    assert validate_path("/Game/MyAsset") is True


def test_validate_path_accepts_engine_path():
    assert validate_path("/Engine/MyAsset") is True


def test_validate_path_rejects_empty():
    with pytest.raises(ValueError, match="cannot be empty"):
        validate_path("")


def test_validate_path_rejects_traversal():
    with pytest.raises(ValueError, match="traversal"):
        validate_path("../etc/passwd")


def test_validate_path_rejects_invalid_root():
    with pytest.raises(ValueError, match="must start with"):
        validate_path("/Invalid/Path")


def test_validate_path_rejects_none():
    with pytest.raises(ValueError, match="cannot be empty"):
        validate_path(None)


# ---------------------------------------------------------------------------
# parse_params
# ---------------------------------------------------------------------------

def test_parse_params_valid_json():
    result = parse_params('{"key": "value"}')
    assert result == {"key": "value"}


def test_parse_params_empty_string():
    result = parse_params("")
    assert result == {}


def test_parse_params_whitespace_only():
    result = parse_params("   ")
    assert result == {}


def test_parse_params_none():
    result = parse_params(None)
    assert result == {}


def test_parse_params_invalid_json():
    with pytest.raises(ValueError, match="Invalid JSON"):
        parse_params("not json")


def test_parse_params_json_array_raises():
    with pytest.raises(ValueError, match="Expected JSON object"):
        parse_params("[1, 2, 3]")


# ---------------------------------------------------------------------------
# get_required_param
# ---------------------------------------------------------------------------

def test_get_required_param_present():
    assert get_required_param({"key": "value"}, "key") == "value"


def test_get_required_param_missing():
    with pytest.raises(ValueError, match="Missing required parameter: key"):
        get_required_param({}, "key")


def test_get_required_param_wrong_type():
    with pytest.raises(ValueError, match="must be int"):
        get_required_param({"count": "five"}, "count", param_type=int)


def test_get_required_param_correct_type():
    assert get_required_param({"count": 5}, "count", param_type=int) == 5


# ---------------------------------------------------------------------------
# get_optional_param
# ---------------------------------------------------------------------------

def test_get_optional_param_present():
    assert get_optional_param({"key": "val"}, "key") == "val"


def test_get_optional_param_missing_returns_default():
    assert get_optional_param({}, "key", default="fallback") == "fallback"


def test_get_optional_param_missing_default_none():
    assert get_optional_param({}, "key") is None


def test_get_optional_param_wrong_type():
    with pytest.raises(ValueError, match="must be int"):
        get_optional_param({"n": "hello"}, "n", param_type=int)


# ---------------------------------------------------------------------------
# execute_wrapper
# ---------------------------------------------------------------------------

def test_execute_wrapper_success():
    @execute_wrapper
    def execute(params):
        return make_result(data="hello")

    raw = execute('{"x": 1}')
    result = json.loads(raw)
    assert result["success"] is True
    assert result["data"] == "hello"


def test_execute_wrapper_empty_params():
    @execute_wrapper
    def execute(params):
        assert params == {}
        return make_result()

    raw = execute("")
    result = json.loads(raw)
    assert result["success"] is True


def test_execute_wrapper_value_error_returns_5102():
    @execute_wrapper
    def execute(params):
        raise ValueError("bad input")

    raw = execute("{}")
    result = json.loads(raw)
    assert result["success"] is False
    assert result["error"]["code"] == 5102
    assert "bad input" in result["error"]["message"]


def test_execute_wrapper_general_exception_returns_5101():
    @execute_wrapper
    def execute(params):
        raise RuntimeError("something exploded")

    raw = execute("{}")
    result = json.loads(raw)
    assert result["success"] is False
    assert result["error"]["code"] == 5101
    assert "something exploded" in result["error"]["message"]


def test_execute_wrapper_invalid_json_returns_5102():
    @execute_wrapper
    def execute(params):
        return make_result()

    raw = execute("not json at all")
    result = json.loads(raw)
    assert result["success"] is False
    assert result["error"]["code"] == 5102


def test_execute_wrapper_passes_parsed_dict():
    received = {}

    @execute_wrapper
    def execute(params):
        received.update(params)
        return make_result()

    execute('{"alpha": 1, "beta": "two"}')
    assert received == {"alpha": 1, "beta": "two"}
