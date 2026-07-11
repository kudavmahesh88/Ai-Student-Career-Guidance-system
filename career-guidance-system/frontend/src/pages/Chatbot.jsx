import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import axiosClient from "../api/axiosClient";

/**
 * Chatbot page.
 * Free-form follow-up Q&A against POST /api/chat, which routes to the
 * Career Chatbot Agent. That agent automatically recalls prior context
 * (profile summary, skill gap, career recs) via the LangGraph memory
 * checkpointer for this student's thread_id, so answers stay grounded
 * without the frontend needing to resend that context itself.
 */
export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    axiosClient
      .get("/chat")
      .then(({ data }) => setMessages(data))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);

    try {
      const { data } = await axiosClient.post("/chat", { question });
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong reaching the career chatbot. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Career Chatbot">
      <div className="glass-panel flex h-[70vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {loadingHistory ? (
            <p className="text-ink-500">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-ink-300">Ask me anything about your career path.</p>
              <p className="mt-1 text-sm text-ink-500">
                e.g. "Why was Backend Engineer recommended for me?" or "What should I learn first?"
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-accent-indigo to-accent-violet text-white"
                      : "border border-white/10 bg-white/5 text-ink-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ink-500">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-3 border-t border-white/10 p-4">
          <input
            className="input-field flex-1"
            placeholder="Ask a follow-up question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary shrink-0">
            Send
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
