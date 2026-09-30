'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createVoterSession, getVoterSession, destroyVoterSession } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

export async function loginVoter(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString().trim();

  if (!username || !password) {
    return { error: 'Username dan Password wajib diisi.' };
  }

  const supabase = createAdminClient();
  const escapedUsername = username.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

  // Find voter by username (case-insensitive)
  const { data: voter, error } = await supabase
    .from('voters')
    .select('*')
    .ilike('username', escapedUsername)
    .maybeSingle();

  if (error || !voter) {
    return { error: 'Username atau Password salah.' };
  }

  // RULE 1: Direct check on has_voted
  if (voter.has_voted) {
    return { error: 'Akun telah digunakan untuk memilih.' };
  }

  // Verify password (supports raw_password match, uppercase comparison, or bcrypt hash)
  let isPasswordValid = false;

  if (voter.raw_password && voter.raw_password.toUpperCase() === password.toUpperCase()) {
    isPasswordValid = true;
  } else if (voter.password_hash.startsWith('$2a$') || voter.password_hash.startsWith('$2b$')) {
    isPasswordValid = await bcrypt.compare(password, voter.password_hash);
  } else {
    isPasswordValid = voter.password_hash.toUpperCase() === password.toUpperCase();
  }

  if (!isPasswordValid) {
    return { error: 'Username atau Password salah.' };
  }

  // Create session
  await createVoterSession({ id: voter.id, username: voter.username });
  return { success: true };
}

export async function submitVoteAction(candidateId: string) {
  const session = await getVoterSession();

  if (!session) {
    return { error: 'Sesi memilih Anda telah berakhir. Silakan login kembali.' };
  }

  const supabase = createAdminClient();

  // Verify voter status again from database
  const { data: voter } = await supabase
    .from('voters')
    .select('has_voted')
    .eq('id', session.id)
    .single();

  if (!voter) {
    await destroyVoterSession();
    return { error: 'Data pemilih tidak ditemukan.' };
  }

  if (voter.has_voted) {
    await destroyVoterSession();
    return { error: 'Akun telah digunakan untuk memilih.' };
  }

  // Attempt RPC first for atomic operation
  const { error: rpcError } = await supabase.rpc('submit_vote_atomic', {
    p_voter_id: session.id,
    p_candidate_id: candidateId,
  });

  if (rpcError) {
    console.warn('RPC submit_vote_atomic fallback triggered:', rpcError.message);
    
    // Fallback atomic strategy: 2 operations in sequence
    // 1. Insert into votes (ANONYMOUS: NO voter_id)
    const { error: insertError } = await supabase
      .from('votes')
      .insert({ candidate_id: candidateId });

    if (insertError) {
      return { error: 'Gagal mengirimkan suara. Silakan coba lagi.' };
    }

    // 2. Update voter status
    const { error: updateError } = await supabase
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) {
      console.error('Failed to update voter status:', updateError.message);
    }
  }

  // RULE 2: Immediately destroy session (auto logout)
  await destroyVoterSession();

  return { success: true };
}

export async function logoutVoterAction() {
  await destroyVoterSession();
}
