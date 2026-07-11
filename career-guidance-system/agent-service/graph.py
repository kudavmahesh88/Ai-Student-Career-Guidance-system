"""
LangGraph StateGraph definition — full pipeline.

    START -> orchestrator --(conditional: request_type)--> one of:
                 profile_analysis | skill_assessment | career_recommendation |
                 learning_roadmap | resume_analyzer | chatbot

    profile_analysis      --(conditional: full_pipeline?)--> skill_assessment | END
    skill_assessment       --(conditional: full_pipeline?)--> career_recommendation | END
    career_recommendation  --(conditional: full_pipeline?)--> learning_roadmap | END
    learning_roadmap       ------------------------------------> course_recommendation  (always)
    course_recommendation  ------------------------------------> END
    resume_analyzer         ------------------------------------> END
    chatbot                 ------------------------------------> END

Every routing decision above is a real `add_conditional_edges` call reading
`state["next_agent"]` or `state["request_type"]` at runtime - this graph
actually branches differently depending on what the caller asked for.

A MemorySaver checkpointer is attached, keyed by thread_id (one per
student), so state - profile summary, skill gaps, career recs, roadmap,
and chat history - persists across separate invocations. This is what lets
the Chatbot Agent answer follow-up questions with full prior context.
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.state import GraphState
from agents.orchestrator import (
    orchestrator_node,
    route_from_orchestrator,
    continue_if_full_pipeline,
)
from agents.profile_analysis_agent import profile_analysis_node
from agents.skill_assessment_agent import skill_assessment_node
from agents.career_recommendation_agent import career_recommendation_node
from agents.learning_roadmap_agent import learning_roadmap_node
from agents.course_recommendation_agent import course_recommendation_node
from agents.resume_analyzer_agent import resume_analyzer_node
from agents.chatbot_agent import chatbot_node


def build_graph():
    workflow = StateGraph(GraphState)

    # --- Nodes ---
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("profile_analysis", profile_analysis_node)
    workflow.add_node("skill_assessment", skill_assessment_node)
    workflow.add_node("career_recommendation", career_recommendation_node)
    workflow.add_node("learning_roadmap", learning_roadmap_node)
    workflow.add_node("course_recommendation", course_recommendation_node)
    workflow.add_node("resume_analyzer", resume_analyzer_node)
    workflow.add_node("chatbot", chatbot_node)

    workflow.set_entry_point("orchestrator")

    # --- Conditional routing out of the orchestrator (picks the entry agent) ---
    workflow.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "profile_analysis": "profile_analysis",
            "skill_assessment": "skill_assessment",
            "career_recommendation": "career_recommendation",
            "learning_roadmap": "learning_roadmap",
            "resume_analyzer": "resume_analyzer",
            "chatbot": "chatbot",
        },
    )

    # --- Chained conditional routing: only continue the pipeline if the
    #     caller explicitly asked for "full_pipeline"; otherwise stop after
    #     the single requested agent ---
    workflow.add_conditional_edges(
        "profile_analysis",
        continue_if_full_pipeline("skill_assessment"),
        {"skill_assessment": "skill_assessment", "stop": END},
    )
    workflow.add_conditional_edges(
        "skill_assessment",
        continue_if_full_pipeline("career_recommendation"),
        {"career_recommendation": "career_recommendation", "stop": END},
    )
    workflow.add_conditional_edges(
        "career_recommendation",
        continue_if_full_pipeline("learning_roadmap"),
        {"learning_roadmap": "learning_roadmap", "stop": END},
    )

    # --- Learning roadmap always pairs with course recommendation ---
    workflow.add_edge("learning_roadmap", "course_recommendation")
    workflow.add_edge("course_recommendation", END)

    # --- Standalone branches ---
    workflow.add_edge("resume_analyzer", END)
    workflow.add_edge("chatbot", END)

    # --- Memory: persists state per thread_id across invocations ---
    checkpointer = MemorySaver()

    return workflow.compile(checkpointer=checkpointer)


career_graph = build_graph()
