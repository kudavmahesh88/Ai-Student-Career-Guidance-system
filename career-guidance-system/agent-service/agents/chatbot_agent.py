"""
Career Chatbot Agent.

Answers free-form follow-up questions from the student, using whatever
context is already present in the shared state for that thread_id
(profile_summary, skill gap, recommended careers, roadmap - all populated
by earlier graph runs and recalled via the MemorySaver checkpointer) plus
the running message history for conversational continuity.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from agents.state import GraphState

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.5,
)

SYSTEM_PROMPT = (
    "You are a friendly, knowledgeable career guidance chatbot for a student. "
    "Use the student's context below (if available) to give specific, grounded "
    "answers instead of generic advice. Keep answers concise and practical."
)


def chatbot_node(state: GraphState) -> dict:
    """
    Builds context from prior graph state (recalled via checkpointer memory)
    and the message history, calls Gemini, and appends the exchange to
    messages so future turns in the same thread have full context.
    """
    question = state.get("user_question", "")
    history = state.get("messages", [])

    context_lines = []
    if state.get("profile_summary"):
        context_lines.append(f"Profile summary: {state['profile_summary']}")
    if state.get("matched_skills") or state.get("missing_skills"):
        context_lines.append(
            f"Matched skills: {', '.join(state.get('matched_skills', []))}. "
            f"Missing skills: {', '.join(state.get('missing_skills', []))}."
        )
    if state.get("recommended_careers"):
        titles = ", ".join([c.get("title", "") for c in state["recommended_careers"]])
        context_lines.append(f"Recommended careers: {titles}")
    context_block = "\n".join(context_lines) if context_lines else "No prior context available yet."

    # Reconstruct conversation as LangChain messages so multi-turn context is preserved.
    lc_messages = [SystemMessage(content=f"{SYSTEM_PROMPT}\n\nStudent context:\n{context_block}")]
    for msg in history[-10:]:  # keep last 10 turns to bound prompt size
        if msg.get("role") == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        else:
            lc_messages.append(AIMessage(content=msg["content"]))
    lc_messages.append(HumanMessage(content=question))

    try:
        response = llm.invoke(lc_messages)
        answer = response.content.strip()
    except Exception as e:
        errors = state.get("errors", [])
        errors.append(f"chatbot_agent failed: {str(e)}")
        return {"chatbot_answer": "", "errors": errors}

    updated_history = history + [
        {"role": "user", "content": question},
        {"role": "assistant", "content": answer},
    ]

    return {"chatbot_answer": answer, "messages": updated_history}
