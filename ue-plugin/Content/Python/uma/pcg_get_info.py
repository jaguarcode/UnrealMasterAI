"""
pcg.getInfo script.
Returns nodes, connections, and settings for a PCGGraph asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    graph_path = get_required_param(params, "graphPath")
    validate_path(graph_path)

    graph = unreal.EditorAssetLibrary.load_asset(graph_path)
    if graph is None:
        return make_error(8810, f"PCGGraph not found: {graph_path}")

    if not isinstance(graph, unreal.PCGGraph):
        return make_error(8811, f"Asset is not a PCGGraph: {graph_path}")

    nodes = []
    try:
        for node in graph.get_nodes():
            node_info = {
                "nodeId": str(node.get_name()),
                "nodeType": node.get_class().get_name() if node.get_class() else "Unknown",
            }
            nodes.append(node_info)
    except Exception:
        nodes = []

    connections = []
    try:
        for edge in graph.get_edges():
            connections.append({
                "sourceNode": str(edge.input_node.get_name()) if edge.input_node else None,
                "sourcePin": str(edge.input_pin_label) if hasattr(edge, "input_pin_label") else None,
                "targetNode": str(edge.output_node.get_name()) if edge.output_node else None,
                "targetPin": str(edge.output_pin_label) if hasattr(edge, "output_pin_label") else None,
            })
    except Exception:
        connections = []

    return make_result(
        graphPath=graph_path,
        nodeCount=len(nodes),
        nodes=nodes,
        connections=connections,
    )
