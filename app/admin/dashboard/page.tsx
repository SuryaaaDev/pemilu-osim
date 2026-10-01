import { getAdminSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import DashboardClient, { CandidateItem, VoterItem } from './dashboard-client';

export const dynamic = 'force-dynamic';

async function fetchAllVoters(supabase: ReturnType<typeof createAdminClient>) {
  let allVoters: Array<{
    id: string;
    username: string;
    raw_password: string | null;
    has_voted: boolean;
    voted_at: string | null;
    created_at: string;
  }> = [];
  
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('voters')
      .select('id, username, raw_password, has_voted, voted_at, created_at')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allVoters = allVoters.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allVoters;
}

async function fetchAllVotes(supabase: ReturnType<typeof createAdminClient>) {
  let allVotes: Array<{ candidate_id: string | null }> = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('votes')
      .select('candidate_id')
      .range(from, to);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allVotes = allVotes.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allVotes;
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  const supabase = createAdminClient();

  // Fetch ALL voters using paginated chunking (bypasses Supabase 1000 default row limit)
  const votersData = await fetchAllVoters(supabase);

  // Fetch candidates
  const { data: candidatesData } = await supabase
    .from('candidates')
    .select('*')
    .order('candidate_number', { ascending: true });

  // Fetch ALL votes table records to aggregate per candidate
  const votesData = await fetchAllVotes(supabase);

  const voteCountsMap: Record<string, number> = {};
  (votesData || []).forEach((vote) => {
    if (vote.candidate_id) {
      voteCountsMap[vote.candidate_id] = (voteCountsMap[vote.candidate_id] || 0) + 1;
    }
  });

  const candidates: CandidateItem[] = (candidatesData || []).map((c) => ({
    id: c.id,
    candidate_number: c.candidate_number,
    name: c.name,
    vision: c.vision,
    mission: Array.isArray(c.mission) ? c.mission : [c.mission],
    photo_url: c.photo_url,
    vote_count: voteCountsMap[c.id] || 0,
  }));

  const voters: VoterItem[] = (votersData || []).map((v) => ({
    id: v.id,
    username: v.username,
    raw_password: v.raw_password || '******',
    has_voted: v.has_voted,
    voted_at: v.voted_at,
    created_at: v.created_at,
  }));

  const totalVotes = votesData?.length || 0;

  return (
    <DashboardClient
      candidates={candidates}
      voters={voters}
      totalVotes={totalVotes}
    />
  );
}
