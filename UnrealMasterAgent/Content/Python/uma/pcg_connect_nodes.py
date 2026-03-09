"""
pcg.connectNodes script.
Connects two nodes in a PCGGraph via their output/input pins.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    graph_path = get_required_param(params, "graphPath")
    source_node = get_required_param(params, "sourceNode")
    source_pin = get_required_param(params, "sourcePin")
    target_node = get_required_param(params, "targetNode")
    target_pin = get_required_param(params, "targetPin")
    validate_path(graph_path)

    graph = unreal.EditorAssetLibrary.load_asset(graph_path)
    if graph is None:
        return make_error(8830, f"PCGGraph not found: {graph_path}")

    if not isinstance(graph, unreal.PCGGraph):
        return make_error(8831, f"Asset is not a PCGGraph: {graph_path}")

    # Locate source and target nodes by name
    nodes = {}
    try:
        for node in graph.get_nodes():
            nodes[node.get_name()] = node
    except Exception as e:
        return make_error(8832, f"Failed to enumerate graph nodes: {str(e)}")

    src = nodes.get(source_node)
    tgt = nodes.get(target_node)

    if src is None:
        return make_error(8833, f"Source node not found: {source_node}")
    if tgt is None:
        return make_error(8834, f"Target node not found: {target_node}")

    try:
        connected = graph.add_edge(src, source_pin, tgt, target_pin)
        if not connected:
            return make_error(8835, f"Failed to connect {source_node}.{source_pin} -> {target_node}.{target_pin}")
    except Exception as e:
        return make_error(8836, f"Error connecting nodes: {str(e)}")

    unreal.EditorAssetLibrary.save_asset(graph_path)

    return make_result(
        graphPath=graph_path,
        sourceNode=source_node,
        sourcePin=source_pin,
        targetNode=target_node,
        targetPin=target_pin,
        connected=True,
    )
