"""
pcg.addNode script.
Adds a node of the specified type to an existing PCGGraph asset.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    graph_path = get_required_param(params, "graphPath")
    node_type = get_required_param(params, "nodeType")
    node_label = params.get("nodeLabel", node_type)
    validate_path(graph_path)

    graph = unreal.EditorAssetLibrary.load_asset(graph_path)
    if graph is None:
        return make_error(8820, f"PCGGraph not found: {graph_path}")

    if not isinstance(graph, unreal.PCGGraph):
        return make_error(8821, f"Asset is not a PCGGraph: {graph_path}")

    # Resolve the node class
    node_class = unreal.load_class(None, node_type)
    if node_class is None:
        return make_error(8822, f"PCG node type not found: {node_type}")

    try:
        new_node = graph.add_node(node_class)
        if new_node is None:
            return make_error(8823, f"Failed to add node of type: {node_type}")
    except Exception as e:
        return make_error(8824, f"Error adding node: {str(e)}")

    unreal.EditorAssetLibrary.save_asset(graph_path)

    return make_result(
        graphPath=graph_path,
        nodeType=node_type,
        nodeLabel=node_label,
        nodeId=str(new_node.get_name()),
        added=True,
    )
