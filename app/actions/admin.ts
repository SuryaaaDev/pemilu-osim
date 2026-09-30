'use server';

import { createAdminSession, destroyAdminSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRandomCode } from '@/lib/utils';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function loginAdminAction(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString();

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'adminosis';

  if (!username || username.toLowerCase() !== expectedUsername.toLowerCase() || password !== expectedPassword) {
    return { error: 'Kredensial Admin tidak valid.' };
  }

  await createAdminSession(username);
  redirect('/admin/dashboard');
}

export async function logoutAdminAction() {
  await destroyAdminSession();
  redirect('/');
}

// ==========================================
// VOTER MANAGEMENT ACTIONS
// ==========================================

export async function createVoterAction(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  let password = formData.get('password')?.toString().trim();

  if (!username) {
    return { error: 'Username wajib diisi.' };
  }

  // Auto-generate 6-character uppercase code if missing or requested
  if (!password) {
    password = generateRandomCode(6);
  } else {
    password = password.toUpperCase();
  }

  const supabase = createAdminClient();
  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase.from('voters').insert({
    username,
    password_hash: hashedPassword,
    raw_password: password,
    has_voted: false,
  });

  if (error) {
    if (error.code === '23505') { // Unique constraint
      return { error: `Username '${username}' sudah terdaftar.` };
    }
    return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
  return { success: true, generatedPassword: password };
}

export async function bulkImportVotersAction(voters: { username: string; password?: string }[]) {
  if (!voters || voters.length === 0) {
    return { error: 'Data pemilih tidak boleh kosong.' };
  }

  const supabase = createAdminClient();

  const records = await Promise.all(
    voters.map(async (v) => {
      const pwd = v.password && v.password.trim() ? v.password.trim().toUpperCase() : generateRandomCode(6);
      return {
        username: v.username.trim(),
        password_hash: await bcrypt.hash(pwd, 10),
        raw_password: pwd,
        has_voted: false,
      };
    })
  );

  const { error } = await supabase.from('voters').upsert(records, {
    onConflict: 'username',
    ignoreDuplicates: false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
  return { success: true, count: voters.length };
}

export async function deleteVoterAction(voterId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.from('voters').delete().eq('id', voterId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
  return { success: true };
}

// ==========================================
// CANDIDATE MANAGEMENT ACTIONS
// ==========================================

export async function saveCandidateAction(formData: FormData) {
  const id = formData.get('id')?.toString();
  const candidate_number = parseInt(formData.get('candidate_number')?.toString() || '0', 10);
  const name = formData.get('name')?.toString().trim();
  const vision = formData.get('vision')?.toString().trim();
  const missionRaw = formData.get('mission')?.toString().trim();
  const photo_url = formData.get('photo_url')?.toString().trim() || null;

  if (!candidate_number || !name || !vision || !missionRaw) {
    return { error: 'Semua bidang wajib diisi.' };
  }

  const mission = missionRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const supabase = createAdminClient();

  const candidateData = {
    candidate_number,
    name,
    vision,
    mission,
    photo_url,
  };

  if (id) {
    const { error } = await supabase
      .from('candidates')
      .update(candidateData)
      .eq('id', id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('candidates')
      .insert(candidateData);

    if (error) {
      if (error.code === '23505') {
        return { error: `Nomor kandidat ${candidate_number} sudah digunakan.` };
      }
      return { error: error.message };
    }
  }

  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function deleteCandidateAction(candidateId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidateId);

  if (error) return { error: error.message };

  revalidatePath('/admin/dashboard');
  return { success: true };
}
