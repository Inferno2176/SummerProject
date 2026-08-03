import { useEffect, useState, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { db } from "@/lib/db/service";
import type { GeneratedCoverLetter, GeneratedResume, Job } from "@/lib/db/models";
import { useDialog } from "@/components/ui/dialog";
import AtsAssetViewer from "@/components/jobs/AtsAssetViewer";
import { exportToPDF } from "@/lib/pdf-exporter";
import { 
  Briefcase, 
  MapPin, 
  ExternalLink, 
  Search,
  Zap,
  Save,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FileText,
  Eye,
  Mail,
  Clock,
  X,
  Download,
  Building,
  Globe,
  Share2
} from "lucide-react";

type JobTab = "recommended" | "saved" | "applied" | "rejected";
type JobAssets = {
  resume?: GeneratedResume;
  coverLetter?: GeneratedCoverLetter;
};
type AssetViewerState = {
  job: Job;
  mode: "resume" | "coverLetter" | "application";
} | null;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<JobTab>("recommended");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [jobAssets, setJobAssets] = useState<Record<string, JobAssets>>({});
  const [assetViewer, setAssetViewer] = useState<AssetViewerState>(null);
  const [activeJobModal, setActiveJobModal] = useState<Job | null>(null);
  const dialog = useDialog();

  const loadJobs = async () => {
    try {
      setLoading(true);
      const allJobs = await db.listAllJobs();
      setJobs(allJobs);

      const users = await db.listUsers();
      if (users.length > 0) {
        const userId = users[0].id;
        const [generatedResumes, generatedCoverLetters] = await Promise.all([
          db.listAllGeneratedResumes(userId),
          db.listAllGeneratedCoverLetters(userId),
        ]);

        setJobAssets(buildJobAssets(generatedResumes, generatedCoverLetters));
      }
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
        await dialog.warning({
          title: "Resume required",
          description: "Please upload a resume before generating an ATS resume.",
        });
        return;
      }

      await db.generateAtsResume(jobId, defaultResume.id);
      await loadJobs();
      await dialog.success({
        title: "ATS resume generated",
        description: "Your ATS resume is ready to view and export as PDF.",
      });
    } catch (err) {
      console.error("Failed to generate ATS resume", err);
      await dialog.error({
        title: "Resume generation failed",
        description: "Make sure Ollama is running or your environment key is set.",
      });
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
        await dialog.warning({
          title: "Resume required",
          description: "Please upload a resume before generating a cover letter.",
        });
        return;
      }

      await db.generateCoverLetter(jobId, defaultResume.id);
      await loadJobs();
      await dialog.success({
        title: "Cover Letter generated",
        description: "Your Cover Letter is ready to view and export as PDF.",
      });
    } catch (err) {
      console.error("Failed to generate Cover Letter", err);
      await dialog.error({
        title: "Cover Letter generation failed",
        description: "Make sure Ollama is running, then try again.",
      });
    } finally {
      setGenerating(null);
      setGenJobId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await db.updateJobStatus(id, status as any);
    await loadJobs();
  };

  const handleDelete = async (id: string) => {
    await db.deleteJob(id);
    if (activeJobModal?.id === id) setActiveJobModal(null);
    await loadJobs();
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesTab = job.status === activeTab;
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [jobs, activeTab, searchTerm]);

  return (
    <div className="flex h-full flex-col space-y-6 p-6 max-w-7xl mx-auto overflow-y-auto">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Discovery (India)</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            AI-matched real tech roles in Bengaluru, Mumbai, Gurgaon, Hyderabad & Remote India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchJobs}
            disabled={fetching}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {fetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Refresh Live Jobs
          </button>
        </div>
      </div>

      {/* SEARCH AND TABS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          {(["recommended", "saved", "applied", "rejected"] as JobTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 text-xs font-bold capitalize transition ${
                activeTab === tab ? "text-blue-500" : "text-[var(--muted)] hover:text-white"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search India jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-2 pl-9 pr-4 text-xs outline-none transition focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* JOB GRID */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
          <Briefcase className="h-10 w-10 text-[var(--muted)] mb-3 opacity-50" />
          <h3 className="text-sm font-semibold">No jobs found</h3>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-sm">
            Click 'Refresh Live Jobs' above to fetch real tech job listings in India.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const assets = jobAssets[job.id] || {};
            return (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => setActiveJobModal(job)}
                generatedResume={assets.resume}
                generatedCoverLetter={assets.coverLetter}
              />
            );
          })}
        </div>
      )}

      {/* JOB DETAILS MODAL */}
      {activeJobModal && (
        <JobDetailModal
          job={activeJobModal}
          onClose={() => setActiveJobModal(null)}
          assets={jobAssets[activeJobModal.id] || {}}
          onGenerateAts={() => handleGenerateAts(activeJobModal.id)}
          onGenerateCV={() => handleGenerateCoverLetter(activeJobModal.id)}
          onStatusUpdate={(status) => handleStatusUpdate(activeJobModal.id, status)}
          onDelete={() => handleDelete(activeJobModal.id)}
          isGenerating={genJobId === activeJobModal.id ? generating as any : null}
          onViewResume={() => {
            setAssetViewer({ job: activeJobModal, mode: "resume" });
          }}
          onViewCoverLetter={() => {
            setAssetViewer({ job: activeJobModal, mode: "coverLetter" });
          }}
        />
      )}

      {/* ASSET VIEWER DIALOG */}
      {assetViewer && (
        <AtsAssetViewer
          job={assetViewer.job}
          mode={assetViewer.mode}
          resume={jobAssets[assetViewer.job.id]?.resume}
          coverLetter={jobAssets[assetViewer.job.id]?.coverLetter}
          onClose={() => setAssetViewer(null)}
          onRegenerateResume={() => handleGenerateAts(assetViewer.job.id)}
          onRegenerateCoverLetter={() => handleGenerateCoverLetter(assetViewer.job.id)}
          onUseForApplication={() => {}}
        />
      )}
    </div>
  );
}

function buildJobAssets(
  generatedResumes: GeneratedResume[],
  generatedCoverLetters: GeneratedCoverLetter[],
) {
  const assets: Record<string, JobAssets> = {};

  for (const resume of generatedResumes) {
    assets[resume.job_id] ??= {};
    if (!assets[resume.job_id].resume) {
      assets[resume.job_id].resume = resume;
    }
  }

  for (const coverLetter of generatedCoverLetters) {
    assets[coverLetter.job_id] ??= {};
    if (!assets[coverLetter.job_id].coverLetter) {
      assets[coverLetter.job_id].coverLetter = coverLetter;
    }
  }

  return assets;
}

function JobCard({
  job,
  onClick,
  generatedResume,
  generatedCoverLetter
}: {
  job: Job;
  onClick: () => void;
  generatedResume?: GeneratedResume;
  generatedCoverLetter?: GeneratedCoverLetter;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-white/[0.02] p-5 cursor-pointer transition hover:border-blue-500/40 hover:bg-white/[0.04]"
    >
      <div>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
            <Building className="h-5 w-5" />
          </div>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
            {job.source || "LinkedIn"}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-bold leading-snug group-hover:text-blue-400 transition line-clamp-1">{job.title}</h3>
          <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{job.company || "Leading Tech Company"}</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            {job.location || "India"}
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            <Clock className="h-3 w-3" />
            {job.posted_date ? new Date(job.posted_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-blue-400 font-medium group-hover:underline">
            Click for details & actions →
          </span>
          {(generatedResume || generatedCoverLetter) && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
              Assets Ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function JobDetailModal({
  job,
  onClose,
  assets,
  onGenerateAts,
  onGenerateCV,
  onStatusUpdate,
  onDelete,
  isGenerating,
  onViewResume,
  onViewCoverLetter
}: {
  job: Job;
  onClose: () => void;
  assets: JobAssets;
  onGenerateAts: () => void;
  onGenerateCV: () => void;
  onStatusUpdate: (status: string) => void;
  onDelete: () => void;
  isGenerating: 'resume' | 'cv' | null;
  onViewResume: () => void;
  onViewCoverLetter: () => void;
}) {
  const sourceName = job.source || "LinkedIn";
  const sourceUrl = job.source_url || `https://www.google.com/search?q=${encodeURIComponent(`${job.title} ${job.company} India`)}`;

  const handleExportPDF = () => {
    exportToPDF({
      title: `${job.title} - ATS Resume`,
      type: 'resume',
      name: 'Applicant Profile',
      jobTitle: job.title,
      company: job.company || 'Tech Company',
      summary: `Targeted resume for ${job.title} at ${job.company}. Position based in ${job.location || 'India'}.`,
      skills: job.matched_skills ? job.matched_skills.split(',') : ['Software Engineering', 'Problem Solving', 'React', 'Node.js'],
      experience: [
        {
          title: job.title,
          company: job.company || 'Current Company',
          duration: '2022 - Present',
          description: [
            `Built scalable software applications matching requirement specs for ${job.title}.`,
            `Optimized user interface performance and reduced system latency by 35%.`,
            `Collaborated with cross-functional teams across India.`
          ]
        }
      ]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{job.title}</h2>
              <p className="text-sm font-medium text-blue-400">{job.company || "Tech Company"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--muted)] hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 text-sm">
          {/* META BAR */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)] bg-white/[0.02] p-3 rounded-lg border border-white/5">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-400" />
              {job.location || "India"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-400" />
              Posted: {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : "Recent"}
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-400" />
              Status: <span className="capitalize font-semibold text-white">{job.status}</span>
            </span>
          </div>

          {/* SOURCE ATTRIBUTION REFERENCE */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 shrink-0" />
              <span>
                <strong>Referenced Source:</strong> Real job listing fetched via <strong>{sourceName}</strong>
              </span>
            </div>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 transition"
            >
              <ExternalLink className="h-3 w-3" />
              Open Original Post
            </a>
          </div>

          {/* DESCRIPTION */}
          <div>
            <h3 className="font-bold text-white mb-2">Job Description & Details</h3>
            <div className="text-[var(--muted)] leading-relaxed whitespace-pre-wrap rounded-lg bg-black/20 p-4 border border-white/5">
              {job.description || "No full description provided. Click 'Open Original Post' above to view full job requirements."}
            </div>
          </div>
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => onStatusUpdate("applied")}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition ${
                job.status === 'applied' ? 'bg-green-500 text-white' : 'bg-white/5 text-[var(--muted)] hover:bg-white/10'
              }`}
            >
              Applied
            </button>
            <button
              onClick={() => onStatusUpdate("rejected")}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition ${
                job.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/5 text-[var(--muted)] hover:bg-white/10'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-white/5 text-red-400 hover:bg-red-500/20 transition"
            >
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            {assets.resume ? (
              <button
                onClick={onViewResume}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              >
                <Eye className="h-4 w-4" /> View Resume
              </button>
            ) : (
              <button
                onClick={onGenerateAts}
                disabled={isGenerating !== null}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-2 text-xs font-semibold hover:bg-blue-600/30"
              >
                {isGenerating === 'resume' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate ATS Resume
              </button>
            )}

            {assets.coverLetter ? (
              <button
                onClick={onViewCoverLetter}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              >
                <Eye className="h-4 w-4" /> View Cover Letter
              </button>
            ) : (
              <button
                onClick={onGenerateCV}
                disabled={isGenerating !== null}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-2 text-xs font-semibold hover:bg-blue-600/30"
              >
                {isGenerating === 'cv' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Generate Cover Letter
              </button>
            )}

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
