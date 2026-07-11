"""
Resume Analyzer Agent.

Takes raw resume text (already extracted from the uploaded PDF by the Node
backend via pdf-parse) and produces an ATS compatibility score plus
concrete improvement suggestions. This node runs standalone (request_type
== "resume_analysis"), independent of the profile pipeline.
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
    "You are an ATS (Applicant Tracking System) resume evaluator. Given raw "
    "resume text, respond with ONLY a JSON object (no markdown, no prose) with "
    'this exact shape: {"ats_score": <number 0-100>, "feedback": ["...", "..."]}. '
    "ats_score reflects how well the resume would parse and rank in a typical "
    "ATS (formatting clarity, keyword density, quantified achievements, "
    "standard section headers). feedback should be 4-7 specific, actionable "
    "bullet points - not generic advice."
)


def _extract_json(text: str) -> dict:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def resume_analyzer_node(state: GraphState) -> dict:
    """Calls Gemini to produce ats_score and resume_feedback."""
    resume_text = state.get("resume_text", "")

    if not resume_text.strip():
        return {
            "ats_score": 0,
            "resume_feedback": ["No resume text was provided to analyze."],
        }

    # Truncate extremely long resumes to keep the prompt reasonable.
    truncated = resume_text[:8000]

    user_prompt = f"Resume text:\n{truncated}\n\nReturn the JSON now."

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        parsed = _extract_json(response.content)
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"resume_analyzer_agent failed: {str(e)}")
        return {"ats_score": 0, "resume_feedback": [], "errors": errors}

    return {
        "ats_score": parsed.get("ats_score", 0),
        "resume_feedback": parsed.get("feedback", []),
    }
