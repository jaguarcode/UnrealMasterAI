"""
Shared utility functions for UMA Python scripts.

Provides JSON input/output handling, error formatting, path validation,
and a decorator for standardizing script execution.
"""
import json
import functools
import traceback


def make_result(**kwargs):
    """Create a success result dictionary.

    Args:
        **kwargs: Key-value pairs to include in the result.

    Returns:
        dict with success=True and all provided kwargs.
    """
    return {"success": True, **kwargs}


def make_error(code, message, **kwargs):
    """Create an error result dictionary.

    Args:
        code: Error code (int).
        message: Human-readable error description.
        **kwargs: Additional context fields.

    Returns:
        dict with success=False, error code and message.
    """
    return {"success": False, "error": {"code": code, "message": message, **kwargs}}


def validate_path(asset_path):
    """Validate that an asset path is within allowed roots.

    Args:
        asset_path: UE content path (e.g., '/Game/Blueprints/MyBP').

    Returns:
        True if the path is valid.

    Raises:
        ValueError: If the path is outside allowed roots or contains traversal.
    """
    allowed_roots = ["/Game/", "/Engine/"]

    if not asset_path:
        raise ValueError("Asset path cannot be empty")

    # Check for path traversal
    if ".." in asset_path:
        raise ValueError(f"Path traversal not allowed: {asset_path}")

    # Check allowed roots
    if not any(asset_path.startswith(root) for root in allowed_roots):
        raise ValueError(
            f"Asset path must start with one of {allowed_roots}, got: {asset_path}"
        )

    return True


def parse_params(params_json):
    """Parse JSON parameter string to dictionary.

    Args:
        params_json: JSON string of parameters.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If JSON is invalid.
    """
    if not params_json or params_json.strip() == "":
        return {}

    try:
        params = json.loads(params_json)
        if not isinstance(params, dict):
            raise ValueError(f"Expected JSON object, got {type(params).__name__}")
        return params
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON parameters: {e}")


def execute_wrapper(func):
    """Decorator that wraps a script's main function with standard JSON I/O and error handling.

    The decorated function receives parsed params dict and should return a dict.
    The decorator handles:
    - JSON parsing of input
    - JSON serialization of output
    - Exception catching and error formatting
    - Standardized error codes (5101 for script errors, 5102 for validation)

    Usage:
        @execute_wrapper
        def execute(params):
            # params is already a dict
            return make_result(data="hello")
    """
    @functools.wraps(func)
    def wrapper(params_json):
        try:
            params = parse_params(params_json)
            result = func(params)
            if isinstance(result, str):
                return result
            return json.dumps(result)
        except ValueError as e:
            return json.dumps(make_error(5102, str(e)))
        except Exception as e:
            tb = traceback.format_exc()
            return json.dumps(make_error(5101, str(e), traceback=tb))

    return wrapper


def get_required_param(params, key, param_type=str):
    """Extract a required parameter with type checking.

    Args:
        params: Parameter dictionary.
        key: Parameter name.
        param_type: Expected type (default: str).

    Returns:
        The parameter value.

    Raises:
        ValueError: If parameter is missing or wrong type.
    """
    if key not in params:
        raise ValueError(f"Missing required parameter: {key}")

    value = params[key]
    if not isinstance(value, param_type):
        raise ValueError(
            f"Parameter '{key}' must be {param_type.__name__}, got {type(value).__name__}"
        )

    return value


def get_optional_param(params, key, default=None, param_type=None):
    """Extract an optional parameter with type checking.

    Args:
        params: Parameter dictionary.
        key: Parameter name.
        default: Default value if not present.
        param_type: Expected type (None to skip type check).

    Returns:
        The parameter value or default.

    Raises:
        ValueError: If parameter is present but wrong type.
    """
    if key not in params:
        return default

    value = params[key]
    if param_type is not None and not isinstance(value, param_type):
        raise ValueError(
            f"Parameter '{key}' must be {param_type.__name__}, got {type(value).__name__}"
        )

    return value
