"""
debug.getLog script.
Retrieves recent log entries, optionally filtered by category.
"""
import unreal
import os
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    category = get_optional_param(params, "category")
    count = get_optional_param(params, "count") or 100

    try:
        count = int(count)
    except (TypeError, ValueError):
        count = 100

    # Read from the project log file
    log_dir = unreal.Paths.project_log_dir()
    log_file = os.path.join(log_dir, "UnrealEditor.log")

    if not os.path.exists(log_file):
        return make_error(5400, f"Log file not found: {log_file}")

    with open(log_file, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    # Filter by category if provided
    if category:
        lines = [l for l in lines if f"[{category}]" in l or f"{category}:" in l]

    # Take last N lines
    recent_lines = lines[-count:] if len(lines) > count else lines

    entries = [line.rstrip("\n") for line in recent_lines]

    return make_result(
        entries=entries,
        count=len(entries),
        category=category,
        logFile=log_file,
    )
