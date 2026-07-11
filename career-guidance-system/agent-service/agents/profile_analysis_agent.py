"""
Profile Analysis Agent.

Takes the student's raw education, interests and goals and produces a
condensed profile_summary using Gemini. This summary is then reused by
downstream agents (skill assessment, career recommendation, etc.) so the
LLM doesn't need to re-read raw fields every time.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from agents.state import GraphState

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.3,
)

SYSTEM_PROMPT = (
    "You are a career counselor's profile analyst. Given a student's education, "
    "interests and goals, write a concise 3-4 sentence profile summary that "
    "captures their academic background, key interests, and career direction. "
    "Be specific and avoid generic filler."
)


def profile_analysis_node(state: GraphState) -> dict:
    """
    Builds a prompt from state fields, calls Gemini, and returns
    the generated profile_summary as a state update.
    """
    education = state.get("education", {})
    interests = state.get("interests", [])
    goals = state.get("goals", "")

    user_prompt = (
        f"Education: {education}\n"
        f"Interests: {', '.join(interests) if interests else 'Not specified'}\n"
        f"Goals: {goals or 'Not specified'}\n\n"
        "Write the profile summary now."
    )

    try:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        summary = response.content.strip()
    except Exception as e:
        summary = ""
        errors = state.get("errors", [])
        errors.append(f"profile_analysis_agent failed: {str(e)}")
        return {"profile_summary": summary, "errors": errors}

    return {"profile_summary": summary}
