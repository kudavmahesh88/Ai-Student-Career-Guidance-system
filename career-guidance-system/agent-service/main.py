"""
FastAPI entrypoint for the LangGraph agent microservice.

Node.js calls these endpoints to run the LangGraph pipeline. This service
is intentionally separate from the Node backend because LangGraph/LangChain
are Python-native; Node calls this over HTTP.
"""

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal

from graph import career_graph

app = FastAPI(title="Career Guidance Agent Service")


class InvokeRequest(BaseModel):
    thread_id: str
    request_type: Literal[
        "profile_analysis",
        "skill_assessment",
        "career_recommendation",
        "learning_roadmap",
        "resume_analysis",
        "full_pipeline",
    ] = "full_pipeline"
    education: Optional[dict] = {}
    interests: Optional[List[str]] = []
    goals: Optional[str] = ""
    current_skills: Optional[List[str]] = []
    target_role: Optional[str] = ""
    resume_text: Optional[str] = ""


class ChatRequest(BaseModel):
    thread_id: str
    question: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/agent/invoke")
def invoke_agent(payload: InvokeRequest):
    """
    Runs the compiled LangGraph StateGraph with the given input state.
    `thread_id` scopes memory/checkpointing to a single student.
    """
    initial_state = {
        "request_type": payload.request_type,
        "education": payload.education,
        "interests": payload.interests,
        "goals": payload.goals,
        "current_skills": payload.current_skills,
        "target_role": payload.target_role,
        "resume_text": payload.resume_text,
    }

    config = {"configurable": {"thread_id": payload.thread_id}}

    try:
        result = career_graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "profile_summary": result.get("profile_summary", ""),
        "skill_gap": {
            "requiredSkills": result.get("required_skills", []),
            "missingSkills": result.get("missing_skills", []),
            "matchedSkills": result.get("matched_skills", []),
            "readinessScore": result.get("readiness_score", 0),
        },
        "recommended_careers": result.get("recommended_careers", []),
        "roadmap": {
            "steps": result.get("roadmap_steps", []),
            "certifications": result.get("certifications", []),
            "projects": result.get("suggested_projects", []),
            "courses": result.get("recommended_courses", []),
        },
        "resume_analysis": {
            "atsScore": result.get("ats_score", 0),
            "feedback": result.get("resume_feedback", []),
        },
        "errors": result.get("errors", []),
    }


@app.post("/api/agent/chat")
def chat_with_agent(payload: ChatRequest):
    """
    Routes to the Chatbot Agent. Uses the same thread_id as the main
    pipeline so the checkpointer's persisted state (profile summary, skill
    gap, career recs) is automatically available as context, and appends
    to the same running message history for multi-turn memory.
    """
    initial_state = {
        "request_type": "chatbot",
        "user_question": payload.question,
    }
    config = {"configurable": {"thread_id": payload.thread_id}}

    try:
        result = career_graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "answer": result.get("chatbot_answer", ""),
        "errors": result.get("errors", []),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
