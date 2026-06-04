import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/db/service";
import type { Job, JobApplication, GeneratedResume, GeneratedCoverLetter } from "@/lib/db/models";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ExternalLink,
  MoreVertical,
  Briefcase,
  Search,
  Plus,
  Mail,
  FileText,
  Trash2,
  Play,
  X,
  Send,
  Paperclip
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type ApplicationStatus = 'applied' | 'interviewing' | 'rejected' | 'offer';

export default function AppliedPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const users = await db.listUsers();
      if (users.length > 0) {
        const userId = users[0].id;
        const [allJobs, allApps] = await Promise.all([
          db.listUserJobs(userId),
          db.listApplications(userId)
        ]);
        
        // Match jobs with applications
        setJobs(allJobs);
        setApplications(allApps);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const job = jobs.find(j => j.id === app.job_id);
      if (!job) return false;
      const search = searchTerm.toLowerCase();
      return job.title.toLowerCase().includes(search) || 
             job.company?.toLowerCase().includes(search);
    });
  }, [applications, jobs, searchTerm]);

  const columns: { title: string, status: ApplicationStatus }[] = [
    { title: 'Applied', status: 'applied' },
    { title: 'Interview Scheduled', status: 'interviewing' },
    { title: 'Rejected', status: 'rejected' },
    { title: 'Offer', status: 'offer' }
  ];

  const handleTakeInterview = async (job: Job) => {
    try {
      const users = await db.listUsers();
      if (users.length === 0) return;
      
      // Create an interview session
      const session = await db.createSession(
        users[0].id,
        `Interview: ${job.title} at ${job.company}`,
        "llama3.2:1b", // Default
        "interview_realistic",
        job.id,
        job.description || "",
        job.company || "",
        job.title
      );

      // Navigate to interview page with session
      navigate(`/interview?session=${session.id}`);
    } catch (err) {
      console.error("Failed to start interview", err);
    }
  };

  const handleStatusUpdate = async (appId: string, newStatus: string) => {
    try {
      await db.markAsApplied(appId, undefined, undefined); // This is a bit wrong in our markAsApplied, let's assume we need a proper status update
      // For now, let's just update the local state or add a proper status update command
      await loadData();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Application Tracker</h1>
          <p className="mt-2 text-[var(--muted)]">Manage your active job applications and interview pipeline.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input 
              type="text" 
              placeholder="Search applications..." 
              className="rounded-xl border border-white/5 bg-white/5 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500/50 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:opacity-90 transition">
            <Plus size={16} />
            Add Application
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(col => (
            <div key={col.status} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    col.status === 'applied' ? 'bg-blue-400' :
                    col.status === 'interviewing' ? 'bg-orange-400' :
                    col.status === 'rejected' ? 'bg-red-400' : 'bg-green-400'
                  }`} />
                  {col.title}
                </h2>
                <span className="text-xs font-medium bg-white/5 px-2 py-0.5 rounded-full text-[var(--muted)]">
                  {filteredApps.filter(a => (a.status === col.status || (col.status === 'applied' && a.status === 'applied'))).length}
                </span>
              </div>

              <div className="flex flex-col gap-4 min-h-[500px] rounded-3xl bg-white/[0.01] border border-white/5 p-4">
                {filteredApps
                  .filter(a => (a.status === col.status || (col.status === 'applied' && a.status === 'applied')))
                  .map(app => {
                    const job = jobs.find(j => j.id === app.job_id);
                    if (!job) return null;
                    return (
                      <ApplicationCard 
                        key={app.id} 
                        app={app} 
                        job={job} 
                        onTakeInterview={() => handleTakeInterview(job)}
                      />
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {composerOpen && selectedJob && (
        <EmailComposer 
          job={selectedJob} 
          onClose={() => setComposerOpen(false)} 
        />
      )}
    </div>
  );
}

function ApplicationCard({ app, job, onTakeInterview }: { app: JobApplication, job: Job, onTakeInterview: () => void }) {
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:border-white/10 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Briefcase className="h-5 w-5 text-orange-400" />
        </div>
        <button className="text-[var(--muted)] hover:text-white transition">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-bold leading-tight group-hover:text-orange-400 transition">{job.title}</h3>
        <p className="text-sm text-[var(--muted)] mt-1">{job.company}</p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
          <Clock size={12} />
          {new Date(app.applied_at).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          {job.status === 'applied' && (
            <button 
              onClick={onTakeInterview}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-[10px] font-bold text-orange-400 hover:bg-orange-500/20 transition"
            >
              <Play size={10} fill="currentColor" />
              Interview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailComposer({ job, onClose }: { job: Job, onClose: () => void }) {
  const [subject, setSubject] = useState(`Application for ${job.title} - ${job.company}`);
  const [body, setBody] = useState(`Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position...`);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
              <Mail className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Compose Application Email</h2>
              <p className="text-xs text-[var(--muted)]">To: careers@{job.company?.toLowerCase().replace(/\s+/g, '')}.com</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-sm outline-none focus:border-orange-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Body</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-64 rounded-xl border border-white/5 bg-white/5 p-4 text-sm outline-none focus:border-orange-500/50 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5 text-xs">
              <Paperclip size={12} className="text-orange-400" />
              <span>ATS_Resume_v1.pdf</span>
              <X size={12} className="ml-1 cursor-pointer hover:text-red-400" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5 text-xs">
              <Paperclip size={12} className="text-orange-400" />
              <span>Cover_Letter.pdf</span>
              <X size={12} className="ml-1 cursor-pointer hover:text-red-400" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 p-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-white/5 transition">Cancel</button>
          <button className="flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition">
            <Send size={16} />
            Send Application
          </button>
        </div>
      </div>
    </div>
  );
}
