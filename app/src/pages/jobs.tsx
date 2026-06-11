import { useEffect, useState, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { db } from "@/lib/db/service";
import type { Job } from "@/lib/db/models";
import { 
  Briefcase, 
  MapPin, 
  ExternalLink, 
  Search,
  Filter,
  Plus,
  Zap,
  Save,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FileText,
  Mail,
  Clock
} from "lucide-react";

type JobTab = "recommended" | "saved" | "applied" | "rejected";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<JobTab>("recommended");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null); // 'resume' | 'cv' | null
  const [genJobId, setGenJobId] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const allJobs = await db.listAllJobs();
      setJobs(allJobs);
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const unlistenJobs = listen<number>("jobs-discovery-completed", async () => {
      await loadJobs();
    });

    return () => {
      unlistenJobs.then((fn) => fn());
    };
  }, []);

  const handleFetchJobs = async () => {
    try {
      setRefreshing(true);
      await db.runSchedulerNow();
      await loadJobs();
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleJobSelection = (id: string) => {
    const newSelected = new Set(selectedJobIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedJobIds(newSelected);
  };

  const handleGenerateAts = async (jobId: string) => {
    try {
      setGenerating('resume');
      setGenJobId(jobId);
      
      const users = await db.listUsers();
      if (users.length === 0) return;
      const userId = users[0].id;

      const resumes = await db.listUserResumes(userId);
      const defaultResume = resumes.find(r => r.is_default) || resumes[0];
      
      if (!defaultResume) {
        alert("Please upload a resume first.");
        return;
      }

      await db.generateAtsResume(jobId, defaultResume.id);
      alert("ATS Resume generated successfully! View it in the ATS page.");
    } catch (err) {
      console.error("Failed to generate ATS resume", err);
      alert("Failed to generate ATS resume. Make sure Ollama is running.");
    } finally {
      setGenerating(null);
      setGenJobId(null);
    }
  };

  const handleGenerateCoverLetter = async (jobId: string) => {
    try {
      setGenerating('cv');
      setGenJobId(jobId);
      
      const users = await db.listUsers();
      if (users.length === 0) return;
      const userId = users[0].id;

      const resumes = await db.listUserResumes(userId);
      const defaultResume = resumes.find(r => r.is_default) || resumes[0];
      
      if (!defaultResume) {
        alert("Please upload a resume first.");
        return;
      }

      await db.generateCoverLetter(jobId, defaultResume.id);
      alert("Cover letter generated successfully! View it in the ATS page.");
    } catch (err) {
      console.error("Failed to generate cover letter", err);
      alert("Failed to generate cover letter. Make sure Ollama is running.");
    } finally {
      setGenerating(null);
      setGenJobId(null);
    }
  };

  const handleBulkGenerate = async (type: 'resume' | 'cv') => {
    const ids = Array.from(selectedJobIds);
    if (ids.length === 0) return;

    if (!confirm(`Generate ${type === 'resume' ? 'ATS Resumes' : 'Cover Letters'} for ${ids.length} jobs? This may take a while.`)) {
      return;
    }

    for (const id of ids) {
      if (type === 'resume') {
        await handleGenerateAts(id);
      } else {
        await handleGenerateCoverLetter(id);
      }
    }
    
    setSelectedJobIds(new Set());
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.company?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = job.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [jobs, searchTerm, activeTab]);

  const handleStatusUpdate = async (id: string, status: string) => {
     try {
       await db.updateJobStatus(id, status as any);
       await loadJobs();
     } catch (err) {
       console.error("Failed to update status", err);
     }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await db.deleteJob(id);
        await loadJobs();
      } catch (err) {
        console.error("Failed to delete job", err);
      }
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Job Discovery</h1>
          <p className="mt-2 text-[var(--muted)]">AI-powered matching across LinkedIn, Indeed, and more.</p>
        </div>
        <div className="flex gap-3">
          {selectedJobIds.size > 0 && (
            <div className="flex items-center gap-2 mr-4 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
              <span className="text-sm font-medium text-orange-400">{selectedJobIds.size} selected</span>
              <div className="h-4 w-px bg-orange-500/20 mx-2" />
              <button 
                onClick={() => handleBulkGenerate('resume')}
                className="text-xs font-bold hover:text-white transition text-[var(--muted)]"
              >
                Gen Resumes
              </button>
              <button 
                onClick={() => handleBulkGenerate('cv')}
                className="text-xs font-bold hover:text-white transition text-[var(--muted)]"
              >
                Gen CVs
              </button>
            </div>
          )}
          <button 
            onClick={handleFetchJobs}
            disabled={fetching}
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-2.5 text-sm font-semibold transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            {fetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-orange-400" />}
            Discover New Jobs
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            Add Manually
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-1">
        {(["recommended", "saved", "applied", "rejected"] as JobTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative capitalize ${
              activeTab === tab ? "text-orange-500" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input 
            type="text" 
            placeholder="Search discovered jobs..." 
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-3 pl-12 pr-4 outline-none transition focus:border-orange-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>
      </div>

      {loading && !fetching ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                isSelected={selectedJobIds.has(job.id)}
                onToggleSelect={() => toggleJobSelection(job.id)}
                onStatusUpdate={handleStatusUpdate}
                onDelete={handleDeleteJob}
                onGenerateAts={() => handleGenerateAts(job.id)}
                onGenerateCV={() => handleGenerateCoverLetter(job.id)}
                isGenerating={genJobId === job.id ? (generating as 'resume' | 'cv' | null) : null}
              />
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-white/10 p-20 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-white/10" />
              <h3 className="mt-4 text-lg font-medium">No {activeTab} jobs</h3>
              <p className="mt-2 text-[var(--muted)]">
                {activeTab === "recommended" 
                  ? "Click 'Discover New Jobs' to find opportunities matched to your profile." 
                  : `You haven't ${activeTab} any jobs yet.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onToggleSelect: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onGenerateAts: () => void;
  onGenerateCV: () => void;
  isGenerating: 'resume' | 'cv' | null;
}

function formatPostedDate(postedDate?: string) {
  if (!postedDate) return null;

  const date = new Date(postedDate);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JobCard({ 
  job, 
  isSelected, 
  onToggleSelect, 
  onStatusUpdate, 
  onDelete,
  onGenerateAts,
  onGenerateCV,
  isGenerating
}: JobCardProps) {
  const postedDate = formatPostedDate(job.posted_date);

  return (
    <div className={`group relative flex flex-col rounded-3xl border transition p-6 ${
      isSelected 
        ? "border-orange-500/50 bg-orange-500/[0.03]" 
        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
    }`}>
      {/* Selection Checkbox */}
      <button 
        onClick={onToggleSelect}
        className={`absolute top-6 left-6 h-5 w-5 rounded border transition-colors flex items-center justify-center ${
          isSelected ? "bg-orange-500 border-orange-500" : "bg-white/5 border-white/10"
        }`}
      >
        {isSelected && <CheckCircle2 size={14} className="text-white" />}
      </button>

      <div className="flex items-start justify-between pl-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
          <Briefcase className="h-6 w-6 text-orange-400" />
        </div>
        <div className="flex flex-col items-end gap-2">
          {job.match_score && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-400">
              <Zap size={10} fill="currentColor" />
              {Math.round(job.match_score)}% Match
            </div>
          )}
          <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest">{job.source || 'Direct'}</span>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-bold leading-tight line-clamp-2">{job.title}</h3>
        <p className="mt-1 text-orange-400/80 font-medium">{job.company}</p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <MapPin className="h-4 w-4" />
          <span>{job.location || 'Remote'}</span>
        </div>
        {postedDate && (
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <Clock className="h-4 w-4" />
            <span>Posted {postedDate}</span>
          </div>
        )}
        {job.matched_skills && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {job.matched_skills.split(',').slice(0, 3).map((skill, i) => (
              <span key={i} className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[var(--muted)]">
                {skill}
              </span>
            ))}
            {job.matched_skills.split(',').length > 3 && (
              <span className="text-[10px] text-[var(--muted)] ml-1">+{job.matched_skills.split(',').length - 3} more</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-8 space-y-3">
        <div className="flex items-center gap-2">
          {job.url && (
            <a 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-black transition hover:opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apply Now
            </a>
          )}
          
          <div className="flex gap-2">
            <button 
              onClick={onGenerateAts}
              disabled={isGenerating !== null}
              className="p-2.5 rounded-xl bg-white/5 text-[var(--muted)] hover:text-white transition relative"
              title="Generate ATS Resume"
            >
              {isGenerating === 'resume' ? <RefreshCw size={18} className="animate-spin text-orange-400" /> : <FileText size={18} />}
            </button>
            <button 
              onClick={onGenerateCV}
              disabled={isGenerating !== null}
              className="p-2.5 rounded-xl bg-white/5 text-[var(--muted)] hover:text-white transition relative"
              title="Generate Cover Letter"
            >
              {isGenerating === 'cv' ? <RefreshCw size={18} className="animate-spin text-orange-400" /> : <Mail size={18} />}
            </button>
          </div>
          
          {job.status === "recommended" && (
            <button 
              onClick={() => onStatusUpdate(job.id, "saved")}
              className="p-2.5 rounded-xl bg-white/5 text-[var(--muted)] hover:text-white transition"
              title="Save Job"
            >
              <Save size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex gap-2">
            <button 
              onClick={() => onStatusUpdate(job.id, "applied")}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition ${
                job.status === 'applied' ? 'bg-green-500/10 text-green-400' : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              Applied
            </button>
            <button 
              onClick={() => onStatusUpdate(job.id, "rejected")}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition ${
                job.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              Rejected
            </button>
          </div>
          <button 
            onClick={() => onDelete(job.id)}
            className="text-[var(--muted)] hover:text-red-400 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
