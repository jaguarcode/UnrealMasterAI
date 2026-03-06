"""
project_settings.py - Reads project settings via SystemLibrary and config parsing.
"""
import unreal
import json
import os
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    settings = {}

    # Basic project info via SystemLibrary
    settings['project_name'] = unreal.SystemLibrary.get_game_name()
    settings['engine_version'] = unreal.SystemLibrary.get_engine_version()
    settings['project_directory'] = unreal.SystemLibrary.get_project_directory()
    settings['content_directory'] = unreal.SystemLibrary.get_project_content_directory()

    # Platform info
    settings['platform_name'] = unreal.SystemLibrary.get_platform_name()

    # Try to read DefaultGame.ini for additional settings
    project_dir = unreal.SystemLibrary.get_project_directory()
    config_path = os.path.join(project_dir, 'Config', 'DefaultGame.ini')
    ini_settings = {}

    if os.path.exists(config_path):
        try:
            import configparser
            config = configparser.ConfigParser(strict=False)
            config.read(config_path, encoding='utf-8')
            for section in config.sections():
                ini_settings[section] = dict(config[section])
        except Exception as e:
            ini_settings['_parse_error'] = str(e)

    settings['default_game_ini'] = ini_settings

    return make_result(settings=settings)
