"""
Career Recommendation Agent.

Uses the profile summary and skill gap analysis (produced upstream) to
recommend suitable careers, each with a short explanation of *why* it fits
this specific student. Returns structured JSON parsed into state.
"""

import os
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from agents.state import GraphState

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
)

SYSTEM_PROMPT = (
    "You are a career advisor. Given a student's profile summary, matched skills, "
    "and missing skills, respond with ONLY a JSON object (no markdown, no prose) "
    'with this exact shape: {"careers": [{"title": "...", "reason": "..."}]}. '
    "Recommend 3-5 realistic, specific career paths (not generic like 'Software "
    "Developer' alone - be specific, e.g. 'Backend Engineer (Fintech)'). Each "
    "reason must reference something concrete from the student's profile or skills."
)


def _extract_json(text: str) -> dict:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def career_recommendation_node(state: GraphState) -> dict:
    """Calls Gemini to produce recommended_careers: [{title, reason}]."""
    profile_summary = state.get("profile_summary", "")
    matched_skills = state.get("matched_skills", [])
    missing_skills = state.get("missing_skills", [])
    target_role = state.get("target_role", "")

    user_prompt = (
        f"Profile summary: {profile_summary or 'Not available'}\n"
        f"Stated target role: {target_role or 'Not specified'}\n"
        f"Matched skills: {', '.join(matched_skills) if matched_skills else 'None'}\n"
        f"Missing skills: {', '.join(missing_skills) if missing_skills else 'None'}\n\n"
        "Return the JSON now."
    )

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        parsed = _extract_json(response.content)
        careers = parsed.get("careers", [])
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"career_recommendation_agent failed: {str(e)}")
        return {"recommended_careers": [], "errors": errors}

    return {"recommended_careers": careers}
