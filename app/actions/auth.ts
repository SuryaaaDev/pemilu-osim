'use server';

import { createAdminSession, createVoterSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

export async function unifiedLoginAction(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString().trim();

  if (!username || !password) {
    return { error: 'Username dan Password wajib diisi.' };
  }

  // 1. Check if input matches Admin Credentials from .env (case-insensitive username)
  const expectedAdminUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedAdminPassword = process.env.ADMIN_PASSWORD || 'adminosis';

  if (username.toLowerCase() === expectedAdminUsername.toLowerCase() && password === expectedAdminPassword) {
    await createAdminSession(username);
    return { success: true, redirectUrl: '/admin/dashboard' };
  }

  // 2. If not admin, check Voter Credentials in database (case-insensitive username lookup)
  const supabase = createAdminClient();
  const escapedUsername = username.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

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

  // Verify password (raw 6-char token match, uppercase comparison, or bcrypt hash)
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

  // Create voter session
  await createVoterSession({ id: voter.id, username: voter.username });
  return { success: true, redirectUrl: '/vote' };
}
