"""
analyze.blueprintComplexity script.
Analyzes cyclomatic complexity, node count, and nesting depth per graph in a Blueprint.
Error codes: 9100-9199
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    blueprint_path = get_required_param(params, "blueprintPath")
    validate_path(blueprint_path)

    asset = unreal.EditorAssetLibrary.load_asset(blueprint_path)
    if not asset:
        return make_error(9100, f"Blueprint not found: {blueprint_path}")

    if not isinstance(asset, unreal.Blueprint):
        return make_error(9101, f"Asset is not a Blueprint: {blueprint_path}")

    graphs = []
    total_nodes = 0
    total_complexity = 0

    try:
        bp_graphs = unreal.BlueprintEditorLibrary.get_graphs(asset)
    except Exception:
        bp_graphs = []

    for graph in bp_graphs:
        try:
            nodes = unreal.BlueprintEditorLibrary.get_nodes(graph)
            node_count = len(nodes)

            # Cyclomatic complexity: count branch/conditional nodes
            branch_nodes = 0
            max_nesting = 0
            for node in nodes:
                node_class = node.get_class().get_name()
                if any(keyword in node_class for keyword in ["Branch", "Switch", "ForEach", "ForLoop", "WhileLoop", "Sequence"]):
                    branch_nodes += 1

            # Cyclomatic complexity = branch_nodes + 1
            cyclomatic = branch_nodes + 1

            # Estimate nesting depth by branch count tiers
            if branch_nodes > 10:
                max_nesting = 5
            elif branch_nodes > 5:
                max_nesting = 3
            elif branch_nodes > 2:
                max_nesting = 2
            elif branch_nodes > 0:
                max_nesting = 1

            graph_name = graph.get_name()
            graphs.append({
                "graphName": graph_name,
                "nodeCount": node_count,
                "cyclomaticComplexity": cyclomatic,
                "branchNodes": branch_nodes,
                "estimatedNestingDepth": max_nesting,
            })
            total_nodes += node_count
            total_complexity += cyclomatic
        except Exception as e:
            graphs.append({"graphName": graph.get_name(), "error": str(e)})

    overall_complexity = "low"
    if total_complexity > 20:
        overall_complexity = "high"
    elif total_complexity > 10:
        overall_complexity = "medium"

    return make_result(
        blueprintPath=blueprint_path,
        totalNodeCount=total_nodes,
        totalCyclomaticComplexity=total_complexity,
        overallComplexity=overall_complexity,
        graphCount=len(graphs),
        graphs=graphs,
    )
