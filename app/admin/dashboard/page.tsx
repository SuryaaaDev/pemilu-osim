import { getAdminSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import DashboardClient, { CandidateItem, VoterItem } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  const supabase = createAdminClient();

  // Fetch voters including raw_password for admin view & CSV export
  const { data: votersData } = await supabase
    .from('voters')
    .select('id, username, raw_password, has_voted, voted_at, created_at')
    .order('created_at', { ascending: false });

  // Fetch candidates
  const { data: candidatesData } = await supabase
    .from('candidates')
    .select('*')
    .order('candidate_number', { ascending: true });

  // Fetch votes table records to aggregate per candidate
  const { data: votesData } = await supabase
    .from('votes')
    .select('candidate_id');

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
