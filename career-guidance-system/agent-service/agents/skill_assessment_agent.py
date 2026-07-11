"""
Skill Assessment Agent.

Compares the student's current skills against the industry-standard
skill set required for their target role, using Gemini to both determine
the required skill list and compute the gap. Returns structured JSON
that gets parsed back into the shared state.
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
    temperature=0.2,
)

SYSTEM_PROMPT = (
    "You are a technical skill assessor. Given a target job role and a student's "
    "current skills, respond with ONLY a JSON object (no markdown, no prose) with "
    "these exact keys: "
    '{"required_skills": [...], "matched_skills": [...], "missing_skills": [...], '
    '"readiness_score": <number 0-100>}. '
    "required_skills should be 6-10 realistic industry-standard skills for the role. "
    "readiness_score reflects what percentage of required skills the student already has."
)


def _extract_json(text: str) -> dict:
    """Strips markdown code fences if present and parses the JSON body."""
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def skill_assessment_node(state: GraphState) -> dict:
    """
    Uses the profile_summary (if available) plus target_role and current_skills
    to compute a skill gap analysis via Gemini, returned as structured fields.
    """
    target_role = state.get("target_role", "Software Engineer")
    current_skills = state.get("current_skills", [])
    profile_summary = state.get("profile_summary", "")

    user_prompt = (
        f"Target role: {target_role}\n"
        f"Student's current skills: {', '.join(current_skills) if current_skills else 'None listed'}\n"
        f"Profile context: {profile_summary or 'Not available'}\n\n"
        "Return the JSON now."
    )

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        parsed = _extract_json(response.content)
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"skill_assessment_agent failed: {str(e)}")
        return {
            "required_skills": [],
            "matched_skills": [],
            "missing_skills": [],
            "readiness_score": 0,
            "errors": errors,
        }

    return {
        "required_skills": parsed.get("required_skills", []),
        "matched_skills": parsed.get("matched_skills", []),
        "missing_skills": parsed.get("missing_skills", []),
        "readiness_score": parsed.get("readiness_score", 0),
    }
