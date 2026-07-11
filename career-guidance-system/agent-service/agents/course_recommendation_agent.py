"""
Course Recommendation Agent.

Recommends specific courses to close the student's missing skill gaps.
Always runs immediately after Learning Roadmap in the graph, regardless of
whether the caller asked for "learning_roadmap" or "full_pipeline" - both
flows want a roadmap paired with concrete courses.
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
    "You are a course recommendation engine. Given a list of missing skills, "
    "respond with ONLY a JSON object (no markdown, no prose) with this exact "
    'shape: {"courses": [{"title": "...", "platform": "...", "skill": "..."}]}. '
    "Recommend one well-known real course per missing skill (platforms like "
    "Coursera, Udemy, edX, freeCodeCamp are fine). Keep titles realistic."
)


def _extract_json(text: str) -> dict:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def course_recommendation_node(state: GraphState) -> dict:
    """Calls Gemini to produce recommended_courses: [{title, platform, skill}]."""
    missing_skills = state.get("missing_skills", [])

    user_prompt = (
        f"Missing skills: {', '.join(missing_skills) if missing_skills else 'None listed'}\n\n"
        "Return the JSON now."
    )

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        parsed = _extract_json(response.content)
        courses = parsed.get("courses", [])
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"course_recommendation_agent failed: {str(e)}")
        return {"recommended_courses": [], "errors": errors}

    return {"recommended_courses": courses}
