"""
Shared state definition for the LangGraph multi-agent pipeline.

Every node in the graph receives this state, reads what it needs,
and returns a partial dict of updates. LangGraph merges those updates
back into the shared state before routing to the next node.
"""

from typing import TypedDict, List, Optional, Literal


class GraphState(TypedDict, total=False):
    # --- Routing control (set by the caller, read by the Orchestrator) ---
    request_type: Literal[
        "profile_analysis",
        "skill_assessment",
        "career_recommendation",
        "learning_roadmap",
        "resume_analysis",
        "chatbot",
        "full_pipeline",
    ]

    # --- Raw student input ---
    education: dict
    interests: List[str]
    goals: str
    current_skills: List[str]
    target_role: str

    # --- Orchestrator output ---
    next_agent: str  # which node to route to next

    # --- Profile Analysis Agent output ---
    profile_summary: str

    # --- Skill Assessment Agent output ---
    required_skills: List[str]
    missing_skills: List[str]
    matched_skills: List[str]
    readiness_score: float

    # --- Career Recommendation Agent output ---
    recommended_careers: List[dict]  # [{title, reason}]

    # --- Learning Roadmap Agent output ---
    roadmap_steps: List[dict]  # [{step, description}]
    certifications: List[str]
    suggested_projects: List[str]

    # --- Course Recommendation Agent output ---
    recommended_courses: List[dict]  # [{title, platform, skill}]

    # --- Resume Analyzer Agent input/output ---
    resume_text: str
    ats_score: float
    resume_feedback: List[str]

    # --- Career Chatbot Agent ---
    user_question: str
    chatbot_answer: str
    messages: List[dict]  # [{role, content}] conversational memory

    # --- Bookkeeping ---
    errors: List[str]
