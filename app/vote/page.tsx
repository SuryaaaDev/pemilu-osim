import { getVoterSession, destroyVoterSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import VoteClient from './vote-client';

export const dynamic = 'force-dynamic';

export default async function VotePage() {
  const session = await getVoterSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = createAdminClient();

  // Rule 1 Server-side guard: check has_voted
  const { data: voter, error: voterError } = await supabase
    .from('voters')
    .select('has_voted')
    .eq('id', session.id)
    .single();

  if (voterError || !voter || voter.has_voted) {
    await destroyVoterSession();
    redirect('/login');
  }

  // Fetch candidates sorted by candidate number
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('*')
    .order('candidate_number', { ascending: true });

  if (candidatesError) {
    console.error('Failed to fetch candidates:', candidatesError.message);
  }

  const candidateList = (candidates || []).map((c) => ({
    id: c.id,
    candidate_number: c.candidate_number,
    name: c.name,
    vision: c.vision,
    mission: Array.isArray(c.mission) ? c.mission : [c.mission],
    photo_url: c.photo_url,
  }));

  return <VoteClient voterUsername={session.username} candidates={candidateList} />;
}
