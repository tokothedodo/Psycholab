import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  experiments: string[];
  status: 'open' | 'closed';
  created_at: string;
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
  trial_data?: any; // Added to support rich trial-by-trial behavior tracking
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function createRoom(researcherId: string, experiments: string[]): Promise<Room> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      researcher_id: researcherId,
      code,
      experiments,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
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
    .eq('status', 'open')
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
  const { data, error } = await supabase
    .from('results')
    .insert(result)
    .select()
    .single();
  if (error) throw error;
  return data;
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