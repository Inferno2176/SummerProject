import { useState, useEffect } from "react";
import { 
  Mail, 
  Search, 
  Trash2, 
  Send, 
  Sparkles,
  RefreshCcw,
  Copy,
  ExternalLink
} from "lucide-react";
import { db } from "@/lib/db/service";
import type { Email } from "@/lib/db/models";
import { format } from "date-fns";

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await db.listEmails();
      setEmails(data);
      if (data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      }
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      try {
        await db.markEmailAsRead(email.id);
        setEmails(emails.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      } catch (error) {
        console.error("Failed to mark email as read:", error);
      }
    }
  };

  const handleDeleteEmail = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await db.deleteEmail(id);
      setEmails(emails.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(emails.find(e => e.id !== id) || null);
      }
    } catch (error) {
      console.error("Failed to delete email:", error);
    }
  };

  const handleGenerateReply = async () => {
    if (!selectedEmail) return;
    setGeneratingReply(true);
    try {
      const reply = await db.generateEmailReply(selectedEmail.id);
      setSelectedEmail({ ...selectedEmail, ai_suggested_reply: reply });
      setEmails(emails.map(e => e.id === selectedEmail.id ? { ...e, ai_suggested_reply: reply } : e));
    } catch (error) {
      console.error("Failed to generate reply:", error);
    } finally {
      setGeneratingReply(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const filteredEmails = emails.filter(e => 
    e.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden rounded-3xl border border-white/5 bg-[var(--surface)]">
      {/* LEFT PANE: EMAIL LIST */}
      <div className="w-1/3 flex flex-col border-r border-white/5">
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search emails..."
              className="w-full rounded-xl bg-white/5 py-2 pl-10 pr-4 text-sm outline-none ring-1 ring-white/10 transition-all focus:ring-orange-500/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCcw className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Mail className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-[var(--muted)]">No emails found</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={`group relative cursor-pointer border-b border-white/5 p-4 transition-all hover:bg-white/5 ${
                  selectedEmail?.id === email.id ? "bg-white/10" : ""
                }`}
              >
                {!email.is_read && (
                  <div className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${!email.is_read ? "text-white" : "text-[var(--text)]"}`}>
                      {email.sender}
                    </p>
                    <p className={`mt-0.5 truncate text-xs ${!email.is_read ? "text-white/80 font-medium" : "text-[var(--muted)]"}`}>
                      {email.subject}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                    {format(new Date(email.received_at), "MMM d")}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)] leading-relaxed">
                  {email.body}
                </p>
                {email.is_job_related && (
                  <div className="mt-2 flex">
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-500 ring-1 ring-orange-500/20">
                      Job Related
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => handleDeleteEmail(email.id, e)}
                  className="absolute bottom-4 right-4 rounded-lg p-1.5 text-[var(--muted)] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: EMAIL VIEW */}
      <div className="flex-1 flex flex-col bg-white/[0.02]">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedEmail.subject}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">
                      {selectedEmail.sender[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text)]">{selectedEmail.sender}</p>
                      <p className="text-xs text-[var(--muted)]">to me</p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {format(new Date(selectedEmail.received_at), "MMMM d, yyyy h:mm a")}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {selectedEmail.is_job_related && (
                <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2 text-orange-500 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Analysis</span>
                  </div>
                  <p className="text-sm text-[var(--text)] leading-relaxed">
                    This email appears to be a recruiter reaching out regarding a potential opportunity. 
                    They are interested in your background and would like to discuss next steps.
                  </p>
                </div>
              )}

              <div className="whitespace-pre-wrap text-[var(--text)] leading-relaxed text-sm">
                {selectedEmail.body}
              </div>

              {/* AI Suggested Reply */}
              <div className="mt-12">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/20 text-orange-500">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">AI Draft Assistant</h3>
                  </div>
                  {!selectedEmail.ai_suggested_reply && (
                    <button
                      onClick={handleGenerateReply}
                      disabled={generatingReply}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
                    >
                      {generatingReply ? (
                        <RefreshCcw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Draft Reply with AI
                    </button>
                  )}
                </div>

                {selectedEmail.ai_suggested_reply && (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-[var(--muted)]">Suggested Reply</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(selectedEmail.ai_suggested_reply!)}
                          className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-white/10 hover:text-white"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={handleGenerateReply}
                          disabled={generatingReply}
                          className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-white/10 hover:text-white"
                          title="Regenerate"
                        >
                          <RefreshCcw className={`h-4 w-4 ${generatingReply ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-[var(--text)] leading-relaxed">
                      {selectedEmail.ai_suggested_reply}
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-white/10 border border-white/10">
                        <Send className="h-3.5 w-3.5" />
                        Send Reply
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-orange-600">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Apply with ATS Resume
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 rounded-full bg-white/5 p-6">
              <Mail className="h-12 w-12 text-[var(--muted)]" />
            </div>
            <h3 className="text-lg font-bold text-white">Select an email to read</h3>
            <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
              Choose an email from the list on the left to view its content and AI-powered suggestions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
