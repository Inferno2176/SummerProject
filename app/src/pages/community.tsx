import { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Award,
  TrendingUp,
  Globe,
  Briefcase,
  Send,
  Loader2
} from "lucide-react";
import { supabase } from "../lib/db/cloud-client";
import { formatDistanceToNow } from "date-fns";

type Discussion = {
  id: string;
  title: string;
  author: string;
  replies: number;
  created_at: string;
};

export default function CommunityPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial posts and subscribe to real-time changes
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('discussions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.warn("Supabase not fully configured yet, falling back to mock data");
          setDiscussions([
            { id: "1", title: "How to handle 'What is your expected salary?' question?", author: "Sarah J.", replies: 24, created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: "2", title: "My experience with Google's L4 Software Engineer interview", author: "Mike R.", replies: 156, created_at: new Date(Date.now() - 18000000).toISOString() }
          ]);
        } else if (data) {
          setDiscussions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Subscribe to new posts
    const subscription = supabase
      .channel('public:discussions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discussions' }, payload => {
        setDiscussions(prev => [payload.new as Discussion, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;

    setSubmitting(true);
    try {
      const userProfile = JSON.parse(localStorage.getItem("user_profile") || '{"name":"Anonymous"}');
      
      const { error } = await supabase.from('discussions').insert([{
        title: newPostTitle,
        author: userProfile.name,
        replies: 0,
      }]);

      if (error) {
        // If supabase fails, mock it locally for demo
        setDiscussions(prev => [{
          id: Math.random().toString(),
          title: newPostTitle,
          author: userProfile.name,
          replies: 0,
          created_at: new Date().toISOString()
        }, ...prev]);
      }
      
      setNewPostTitle("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full space-y-6 p-6 max-w-6xl mx-auto overflow-y-auto">
      <div className="text-center space-y-3 py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">hyrd. Community</h1>
        <p className="mx-auto max-w-xl text-sm text-[var(--muted)]">
          Connect with other job seekers in India, share interview experiences, and build your network.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CommunityCard 
          title="Interview Insights" 
          description="Read real-world interview experiences from top tech companies."
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          members="1.2k members"
        />
        <CommunityCard 
          title="Resume Reviews" 
          description="Get constructive feedback on your resume from industry peers."
          icon={<Share2 className="h-5 w-5 text-purple-400" />}
          members="850 members"
        />
        <CommunityCard 
          title="Skill Badges" 
          description="Earn badges for completing mock interviews and challenges."
          icon={<Award className="h-5 w-5 text-blue-400" />}
          members="Coming Soon"
        />
      </div>

      {/* Featured Discussions */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-green-400" />
            Live Discussions
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm text-emerald-400">Real-time sync active</span>
          </div>
        </div>

        {/* Create new post */}
        <form onSubmit={handleCreatePost} className="mb-8 flex gap-3">
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Start a new discussion..."
            className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-sm outline-none transition focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={submitting || !newPostTitle.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-8 py-4 font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" /></div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted)]">No discussions yet. Be the first to post!</div>
          ) : (
            discussions.map((d) => (
              <DiscussionItem 
                key={d.id}
                title={d.title}
                author={d.author}
                replies={d.replies}
                time={formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
              />
            ))
          )}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex items-center gap-6 rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition hover:bg-white/[0.04]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Globe className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">Active Users Worldwide</p>
            <p className="text-3xl font-bold">12,450+</p>
          </div>
        </div>
        <div className="flex items-center gap-6 rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition hover:bg-white/[0.04]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Briefcase className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">Jobs Found This Month</p>
            <p className="text-3xl font-bold">1,820</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityCard({ title, description, icon, members }: { title: string, description: string, icon: React.ReactNode, members: string }) {
  return (
    <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition hover:bg-white/[0.04]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 transition group-hover:scale-110">
          {icon}
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full border border-white/10 bg-white/5">
          {members}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function DiscussionItem({ title, author, replies, time }: { title: string, author: string, replies: number, time: string }) {
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.01] transition hover:bg-white/[0.03] gap-4">
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-base font-semibold text-white group-hover:text-[var(--accent)] transition line-clamp-1">{title}</h4>
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 mr-1 opacity-80" />
            {author}
          </span>
          <span className="hidden sm:inline">•</span>
          <span>{time}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] shrink-0">
        <MessageSquare className="h-4 w-4" />
        {replies} replies
      </div>
    </div>
  );
}
