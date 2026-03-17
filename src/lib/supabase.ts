import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[PsychoLab] 🚨 CRITICAL: Supabase configuration missing! Check your .env files or hosting provider environment variables.');
} else {
  console.log('[PsychoLab] 🛰️ Supabase client initialized with endpoint:', supabaseUrl.substring(0, 15) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  role: 'researcher' | 'participant';
}

export interface Room {
  id: string;
  researcher_id: string;
  code: string;
  experiment: string;
  config: Record<string, unknown>;
  status: 'draft' | 'active' | 'closed';
  created_at: string;
  title?: string;
}

export interface Result {
  id: string;
  room_id: string;
  participant_id: string;
  experiment_name: string;
  response_time_ms: number;
  answer: string;
  correct_answer: string;
  language: string;
  timestamp: string;
  trial_data?: unknown;
  accuracy?: number;
  total_trials?: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  console.log('[PsychoLab] signIn: attempting login for', email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  console.log('[PsychoLab] signIn: success, user id =', data.user?.id);
  return data;
}

export async function signUp(email: string, password: string) {
  console.log('[PsychoLab] signUp: creating auth user for', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  // Insert into users table with researcher role
  if (data.user) {
    console.log('[PsychoLab] signUp: auth user created, id =', data.user.id);
    console.log('[PsychoLab] signUp: inserting into users table with role=researcher');
    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        role: 'researcher',
      }, { onConflict: 'id' });

    if (insertError) {
      console.error('[PsychoLab] signUp: users table insert failed:', insertError);
      // Don't throw — auth user was created, we'll retry during room creation
    } else {
      console.log('[PsychoLab] signUp: users table insert success');
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Ensure the authenticated user has a record in the users table.
 * If not, create one automatically. This handles cases where signup
 * failed to insert the users record.
 */
export async function ensureUserRecord(userId: string, email: string): Promise<void> {
  console.log('[PsychoLab] ensureUserRecord: checking users table for', userId);

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.log('[PsychoLab] ensureUserRecord: no record found, creating one');
    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'researcher',
      }, { onConflict: 'id' });

    if (insertError) {
      console.error('[PsychoLab] ensureUserRecord: insert failed:', insertError);
      throw new Error(`Failed to create user record: ${insertError.message}`);
    }
    console.log('[PsychoLab] ensureUserRecord: created successfully');
  } else {
    console.log('[PsychoLab] ensureUserRecord: record exists');
  }
}

// ─── Room Code Generation ───────────────────────────────────────────────────

/**
 * Generate a unique 6-digit room code.
 * Checks against existing codes in the database and retries if duplicate.
 */
async function generateUniqueRoomCode(): Promise<string> {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[PsychoLab] generateUniqueRoomCode: attempt ${attempt}, code = ${code}`);

    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (!existing) {
      console.log(`[PsychoLab] generateUniqueRoomCode: code ${code} is unique`);
      return code;
    }

    console.log(`[PsychoLab] generateUniqueRoomCode: code ${code} already exists, retrying`);
  }

  throw new Error('Failed to generate unique room code after 10 attempts');
}

// ─── Room CRUD ──────────────────────────────────────────────────────────────

export async function createRoom(
  researcherId: string,
  experiment: string,
  config: Record<string, unknown> = {}
): Promise<Room> {
  console.log('[PsychoLab] createRoom: starting for researcher', researcherId);
  console.log('[PsychoLab] createRoom: experiment =', experiment);

  // Step 1: Generate unique code
  const code = await generateUniqueRoomCode();
  console.log('[PsychoLab] createRoom: generated code =', code);

  // Step 2: Insert room
  console.log('[PsychoLab] createRoom: inserting into rooms table');
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      researcher_id: researcherId,
      code,
      experiment,
      config,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('[PsychoLab] createRoom: insert failed:', error);
    throw new Error(`Room creation failed: ${error.message}`);
  }

  console.log('[PsychoLab] createRoom: success, room id =', data.id);
  return data;
}

export async function activateRoom(roomId: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'active' })
    .eq('id', roomId);
  if (error) throw error;
}

export async function getRooms(researcherId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('researcher_id', researcherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .in('status', ['active', 'open', 'draft'])
    .single();
  if (error) return null;
  return data;
}

export async function closeRoom(roomId: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'closed' })
    .eq('id', roomId);
  if (error) throw error;
}

export async function saveResult(result: Omit<Result, 'id'>) {
  const { error } = await supabase
    .from('results')
    .insert(result);
  if (error) throw error;
}

export async function getResults(roomId: string): Promise<Result[]> {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('room_id', roomId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRoomResultsCount(roomId: string): Promise<number> {
  const { count, error } = await supabase
    .from('results')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);
  if (error) throw error;
  return count || 0;
}

export async function getUniqueParticipants(roomId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('results')
    .select('participant_id')
    .eq('room_id', roomId);
  if (error) throw error;
  const unique = new Set(data?.map(r => r.participant_id));
  return Array.from(unique);
}