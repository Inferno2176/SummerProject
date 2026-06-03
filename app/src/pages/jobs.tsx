import {
  useMemo,
  useState,
} from "react";

import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import {
  Job,
  mockJobs,
} from "../data/mock-jobs";

const PAGE_SIZE = 10;

function getATSColor(
  score: number
) {
  if (score >= 90) {
    return "bg-emerald-500/10 text-emerald-400";
  }

  if (score >= 80) {
    return "bg-orange-500/10 text-orange-400";
  }

  return "bg-red-500/10 text-red-400";
}

function getStatusColor(
  status: Job["status"]
) {
  switch (status) {
    case "ready":
      return "bg-emerald-500/10 text-emerald-400";

    case "review":
      return "bg-orange-500/10 text-orange-400";

    case "weak":
      return "bg-red-500/10 text-red-400";

    case "applied":
      return "bg-blue-500/10 text-blue-400";

    default:
      return "bg-white/10 text-white";
  }
}

export default function JobsPage() {
  const [query, setQuery] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(
      null
    );

  /*
    FILTERED JOBS
  */
  const filteredJobs =
    useMemo(() => {
      return mockJobs.filter(
        (job:any) =>
          job.role
            .toLowerCase()
            .includes(
              query.toLowerCase()
            ) ||
          job.company
            .toLowerCase()
            .includes(
              query.toLowerCase()
            )
      );
    }, [query]);

  /*
    PAGINATION
  */
  const totalPages =
    Math.ceil(
      filteredJobs.length /
        PAGE_SIZE
    );

  const paginatedJobs =
    filteredJobs.slice(
      (page - 1) *
        PAGE_SIZE,
      page * PAGE_SIZE
    );

  return (
    <div className="flex h-full flex-col gap-5">

      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-4">

        {/* SEARCH */}
        <div className="topbar-chip flex h-12 flex-1 items-center gap-3 rounded-2xl px-4">

          <Search
            size={18}
            className="text-[var(--muted)]"
          />

          <input
            value={query}
            onChange={(
              event
            ) => {
              setQuery(
                event.target
                  .value
              );

              setPage(1);
            }}
            placeholder="Search jobs, companies, skills..."
            className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />

        </div>

        {/* ATS FILTER */}
        <button className="topbar-chip flex h-12 items-center gap-2 rounded-2xl px-4 text-sm text-[var(--text)] transition hover:bg-[var(--surface-2)]">

          <Sparkles size={16} />

          ATS 80+

        </button>

        {/* REMOTE FILTER */}
        <button className="topbar-chip flex h-12 items-center gap-2 rounded-2xl px-4 text-sm text-[var(--text)] transition hover:bg-[var(--surface-2)]">

          <Briefcase size={16} />

          Remote

        </button>

      </div>

      {/* TABLE */}
      <div className="topbar-chip flex flex-1 flex-col overflow-hidden rounded-3xl">

        {/* TABLE HEADER */}
        <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr] border-b border-[var(--border)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">

          <div>Role</div>

          <div>Location</div>

          <div>ATS</div>

          <div>Salary</div>

          <div>Status</div>

          <div>Posted</div>

        </div>

        {/* ROWS */}
        <div className="flex-1 overflow-y-auto">

          {paginatedJobs.map(
            (job:any) => (
              <button
                key={job.id}
                onClick={() =>
                  setSelectedJob(
                    job
                  )
                }
                className="grid w-full grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr] items-center border-b border-[var(--border)] px-6 py-5 text-left transition hover:bg-[var(--surface-2)]"
              >

                {/* ROLE */}
                <div>

                  <p className="font-semibold text-[var(--text)]">
                    {job.role}
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {
                      job.company
                    }
                  </p>

                </div>

                {/* LOCATION */}
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">

                  <MapPin size={15} />

                  {
                    job.location
                  }

                </div>

                {/* ATS */}
                <div>

                  <div
                    className={`inline-flex rounded-xl px-3 py-1 text-sm font-semibold ${getATSColor(
                      job.atsScore
                    )}`}
                  >
                    {
                      job.atsScore
                    }
                    %
                  </div>

                </div>

                {/* SALARY */}
                <div className="text-sm text-[var(--text)]">
                  {job.salary}
                </div>

                {/* STATUS */}
                <div>

                  <div
                    className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold capitalize ${getStatusColor(
                      job.status
                    )}`}
                  >
                    {
                      job.status
                    }
                  </div>

                </div>

                {/* POSTED */}
                <div className="text-sm text-[var(--muted)]">
                  {job.posted}
                </div>

              </button>
            )
          )}

        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">

          <p className="text-sm text-[var(--muted)]">
            Showing{" "}
            {
              paginatedJobs.length
            }{" "}
            of{" "}
            {
              filteredJobs.length
            }{" "}
            jobs
          </p>

          <div className="flex items-center gap-2">

            <button
              disabled={
                page === 1
              }
              onClick={() =>
                setPage(
                  (
                    prev
                  ) =>
                    Math.max(
                      prev -
                        1,
                      1
                    )
                )
              }
              className="topbar-chip flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text)] disabled:opacity-40"
            >
              <ChevronLeft
                size={16}
              />
            </button>

            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text)]">
              {page} /{" "}
              {
                totalPages
              }
            </div>

            <button
              disabled={
                page ===
                totalPages
              }
              onClick={() =>
                setPage(
                  (
                    prev
                  ) =>
                    Math.min(
                      prev +
                        1,
                      totalPages
                    )
                )
              }
              className="topbar-chip flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text)] disabled:opacity-40"
            >
              <ChevronRight
                size={16}
              />
            </button>

          </div>

        </div>

      </div>

      {/* MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

          <div className="relative flex h-[88vh] w-[92vw] max-w-6xl flex-col overflow-hidden rounded-[32px] bg-[var(--surface)] shadow-2xl">

            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-[var(--border)] px-8 py-6">

              <div>

                <div className="flex items-center gap-3">

                  <h2 className="text-3xl font-bold text-[var(--text)]">
                    {
                      selectedJob.role
                    }
                  </h2>

                  <div
                    className={`rounded-xl px-3 py-1 text-sm font-semibold ${getATSColor(
                      selectedJob.atsScore
                    )}`}
                  >
                    ATS{" "}
                    {
                      selectedJob.atsScore
                    }
                    %
                  </div>

                </div>

                <p className="mt-2 text-sm text-[var(--muted)]">
                  {
                    selectedJob.company
                  }{" "}
                  •{" "}
                  {
                    selectedJob.location
                  }
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedJob(
                    null
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <X size={20} />
              </button>

            </div>

            {/* CONTENT */}
            <div className="grid flex-1 grid-cols-[1.2fr_420px] overflow-hidden">

              {/* LEFT */}
              <div className="overflow-y-auto border-r border-[var(--border)] p-8">

                <div className="space-y-8">

                  {/* JD */}
                  <section>

                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Job Description
                    </h3>

                    <div className="rounded-3xl bg-[var(--surface-2)] p-6 text-[15px] leading-7 text-[var(--text)]">
                      {
                        selectedJob.description
                      }
                    </div>

                  </section>

                  {/* SKILLS */}
                  <section>

                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Skills Match
                    </h3>

                    <div className="flex flex-wrap gap-2">

                      {selectedJob.skills.map(
                        (
                          skill:any
                        ) => (
                          <div
                            key={
                              skill
                            }
                            className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400"
                          >
                            {
                              skill
                            }
                          </div>
                        )
                      )}

                      {selectedJob.missingSkills.map(
                        (
                          skill:any
                        ) => (
                          <div
                            key={
                              skill
                            }
                            className="rounded-2xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400"
                          >
                            Missing:{" "}
                            {
                              skill
                            }
                          </div>
                        )
                      )}

                    </div>

                  </section>

                </div>

              </div>

              {/* RIGHT */}
              <div className="overflow-y-auto p-8">

                <div className="space-y-8">

                  {/* AI IMPROVEMENTS */}
                  <section>

                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      AI Resume Improvements
                    </h3>

                    <div className="space-y-3">

                      {selectedJob.tailoredChanges.map(
                        (
                          item:any
                        ) => (
                          <div
                            key={
                              item
                            }
                            className="rounded-2xl bg-[var(--surface-2)] p-4"
                          >

                            <div className="flex items-start gap-3">

                              <div className="mt-1 h-2 w-2 rounded-full bg-orange-400" />

                              <p className="text-sm leading-6 text-[var(--text)]">
                                {
                                  item
                                }
                              </p>

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </section>

                  {/* AUTO APPLY */}
                  <section>

                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Auto Apply
                    </h3>

                    <div className="rounded-3xl bg-[var(--surface-2)] p-6">

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="font-semibold text-[var(--text)]">
                            Resume Ready
                          </p>

                          <p className="mt-1 text-sm text-[var(--muted)]">
                            ATS optimized
                            for this role
                          </p>

                        </div>

                        <button className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01]">

                          Apply Now

                        </button>

                      </div>

                    </div>

                  </section>

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}