"""
Orchestrator Agent.

Entry node of the graph. Reads request_type from the shared state and
decides which specialist agent runs next. This decision is consumed by
add_conditional_edges() calls in graph.py to perform real runtime routing -
not a mocked if/else in the API layer.

Supported request types:
  - "profile_analysis"       -> profile_analysis only
  - "skill_assessment"       -> skill_assessment only
  - "career_recommendation"  -> career_recommendation only
  - "learning_roadmap"       -> learning_roadmap + course_recommendation only
  - "resume_analysis"        -> resume_analyzer only
  - "chatbot"                -> chatbot only
  - "full_pipeline"          -> profile_analysis -> skill_assessment ->
                                 career_recommendation -> learning_roadmap ->
                                 course_recommendation (chained)
"""

from agents.state import GraphState

ENTRY_NODE_FOR_REQUEST_TYPE = {
    "profile_analysis": "profile_analysis",
    "skill_assessment": "skill_assessment",
    "career_recommendation": "career_recommendation",
    "learning_roadmap": "learning_roadmap",
    "resume_analysis": "resume_analyzer",
    "chatbot": "chatbot",
    "full_pipeline": "profile_analysis",
}


def orchestrator_node(state: GraphState) -> dict:
    """Sets next_agent based on request_type; defaults to full_pipeline entry."""
    request_type = state.get("request_type", "full_pipeline")
    next_agent = ENTRY_NODE_FOR_REQUEST_TYPE.get(request_type, "profile_analysis")
    return {"next_agent": next_agent}


def route_from_orchestrator(state: GraphState) -> str:
    """Conditional edge function: routes to whatever the orchestrator decided."""
    return state.get("next_agent", "profile_analysis")


def continue_if_full_pipeline(next_node: str):
    """
    Factory for conditional edge functions used AFTER a node in the main
    chain (profile_analysis -> skill_assessment -> career_recommendation ->
    learning_roadmap -> course_recommendation).

    If the original request was "full_pipeline", continue to next_node.
    Otherwise the caller only wanted this single agent, so stop (END).
    """

    def _router(state: GraphState) -> str:
        if state.get("request_type") == "full_pipeline":
            return next_node
        return "stop"

    return _router
