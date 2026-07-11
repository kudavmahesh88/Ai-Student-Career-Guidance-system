"""
Learning Roadmap Agent.

Generates a step-by-step learning roadmap plus recommended certifications
and projects, based on the student's missing skills and recommended
careers. Runs after Career Recommendation in the full pipeline.
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
    "You are a learning path designer. Given a student's missing skills and "
    "target career(s), respond with ONLY a JSON object (no markdown, no prose) "
    "with this exact shape: "
    '{"roadmap_steps": [{"step": "...", "description": "..."}], '
    '"certifications": ["..."], "suggested_projects": ["..."]}. '
    "roadmap_steps should be 5-8 ordered, concrete, sequential steps (each an "
    "actionable milestone, not vague advice). certifications should be 2-4 "
    "real, recognized certifications relevant to the missing skills. "
    "suggested_projects should be 3-5 specific portfolio project ideas that "
    "would demonstrate the missing skills."
)


def _extract_json(text: str) -> dict:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def learning_roadmap_node(state: GraphState) -> dict:
    """Calls Gemini to produce roadmap_steps, certifications, suggested_projects."""
    missing_skills = state.get("missing_skills", [])
    careers = state.get("recommended_careers", [])
    career_titles = ", ".join([c.get("title", "") for c in careers]) if careers else "Not specified"

    user_prompt = (
        f"Missing skills: {', '.join(missing_skills) if missing_skills else 'None listed'}\n"
        f"Target career(s): {career_titles}\n\n"
        "Return the JSON now."
    )

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        parsed = _extract_json(response.content)
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"learning_roadmap_agent failed: {str(e)}")
        return {
            "roadmap_steps": [],
            "certifications": [],
            "suggested_projects": [],
            "errors": errors,
        }

    return {
        "roadmap_steps": parsed.get("roadmap_steps", []),
        "certifications": parsed.get("certifications", []),
        "suggested_projects": parsed.get("suggested_projects", []),
    }
