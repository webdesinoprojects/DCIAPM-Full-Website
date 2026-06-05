import { isSupabaseConfigured, supabase } from './supabase';
import { uploadContentFile } from './contentUpload';

export const electionStatuses = ['draft', 'scheduled', 'active', 'closed', 'archived'];

export const voteMessages = {
  VOTE_RECORDED: 'Your vote has been recorded.',
  ALREADY_VOTED: 'You have already voted in this election.',
  AUTH_REQUIRED: 'Please log in before voting.',
  PROFILE_NOT_ALLOWED: 'This account is not eligible to vote.',
  PROFILE_INCOMPLETE: 'Complete your voter profile with name, registration number and photo before voting.',
  ELECTION_NOT_FOUND: 'This election could not be found.',
  ELECTION_NOT_ACTIVE: 'Voting is not active for this election.',
  ELECTION_NOT_STARTED: 'Voting has not started yet.',
  ELECTION_ENDED: 'Voting has ended for this election.',
  CANDIDATE_NOT_FOUND: 'This nominee could not be found.',
};

export function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `item-${Date.now()}`;
}

export function normalizeRegistrationNo(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

export function electionRuntimeStatus(election) {
  if (!election) return 'unknown';
  if (election.status === 'draft' || election.status === 'archived') return election.status;

  const now = Date.now();
  const startsAt = election.starts_at ? new Date(election.starts_at).getTime() : null;
  const endsAt = election.ends_at ? new Date(election.ends_at).getTime() : null;

  if (startsAt && now < startsAt) return 'scheduled';
  if (endsAt && now > endsAt) return 'closed';
  return election.status;
}

export function canVoteInElection(election, profile, vote) {
  const runtimeStatus = electionRuntimeStatus(election);
  const completeProfile = Boolean(profile?.full_name && profile?.registration_no && profile?.photo_path);

  return {
    allowed: runtimeStatus === 'active' && completeProfile && !vote,
    runtimeStatus,
    completeProfile,
    reason: vote
      ? 'You have already voted in this election.'
      : !completeProfile
        ? 'Complete your voter profile before voting.'
        : runtimeStatus !== 'active'
          ? 'Voting is not active right now.'
          : '',
  };
}

export function formatDateTime(value) {
  if (!value) return 'Not set';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

export async function listElections({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('elections')
    .select(`
      id,
      slug,
      title,
      description,
      status,
      starts_at,
      ends_at,
      created_at,
      updated_at,
      election_candidates (
        id,
        slug,
        full_name,
        registration_no,
        position,
        message,
        current_designation,
        institution,
        qualification,
        profile_summary,
        key_achievements,
        agenda,
        cv_path,
        cv_file_name,
        cv_mime_type,
        cv_size,
        photo_url,
        photo_path,
        sort_order,
        is_active
      )
    `)
    .order('created_at', { ascending: false });

  if (!admin) {
    query = query.neq('status', 'draft');
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(normalizeElectionRecord);
}

export async function listPublicElectionSummaries({ limit = 20 } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('elections')
    .select('id,slug,title,description,status,starts_at,ends_at,created_at,updated_at')
    .neq('status', 'draft')
    .neq('status', 'archived')
    .order('starts_at', { ascending: true, nullsFirst: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).sort((a, b) => {
    const rank = { active: 0, scheduled: 1, closed: 2, archived: 3, draft: 4 };
    const aStatus = electionRuntimeStatus(a);
    const bStatus = electionRuntimeStatus(b);
    if (rank[aStatus] !== rank[bStatus]) return rank[aStatus] - rank[bStatus];
    return new Date(a.starts_at || a.created_at).getTime() - new Date(b.starts_at || b.created_at).getTime();
  });
}

export async function listHomepageElections() {
  return listPublicElectionSummaries({ limit: 3 });
}

export async function getElectionWithCandidates(slug) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('elections')
    .select(`
      id,
      slug,
      title,
      description,
      status,
      starts_at,
      ends_at,
      created_at,
      updated_at,
      election_candidates (
        id,
        slug,
        full_name,
        registration_no,
        position,
        message,
        current_designation,
        institution,
        qualification,
        profile_summary,
        key_achievements,
        agenda,
        cv_path,
        cv_file_name,
        cv_mime_type,
        cv_size,
        photo_url,
        photo_path,
        sort_order,
        is_active
      )
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeElectionRecord(data) : null;
}

export async function getCandidateForVote(electionSlug, candidateSlug) {
  const election = await getElectionWithCandidates(electionSlug);
  const candidate = election?.candidates.find((item) => item.slug === candidateSlug) ?? null;
  return { election, candidate };
}

export async function getMyVotes(electionIds = []) {
  if (!isSupabaseConfigured || electionIds.length === 0) return {};

  const { data, error } = await supabase
    .from('election_votes')
    .select(`
      id,
      election_id,
      candidate_id,
      created_at,
      election_candidates (
        id,
        slug,
        full_name,
        position
      )
    `)
    .in('election_id', electionIds);

  if (error) throw error;

  return (data || []).reduce((votes, vote) => {
    votes[vote.election_id] = {
      ...vote,
      candidate: vote.election_candidates,
    };
    return votes;
  }, {});
}

export async function castElectionVote(electionSlug, candidateSlug) {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'SUPABASE_NOT_CONFIGURED' };
  }

  const { data, error } = await supabase.rpc('cast_election_vote', {
    p_election_slug: electionSlug,
    p_candidate_slug: candidateSlug,
  });

  if (error) throw error;
  return data?.[0] ?? { ok: false, code: 'UNKNOWN' };
}

export async function createElection(input, userId) {
  const slug = await uniqueElectionSlug(slugify(input.title));
  const payload = {
    slug,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    starts_at: fromDateTimeLocal(input.starts_at),
    ends_at: fromDateTimeLocal(input.ends_at),
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('elections')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateElection(id, input) {
  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    starts_at: fromDateTimeLocal(input.starts_at),
    ends_at: fromDateTimeLocal(input.ends_at),
  };

  const { data, error } = await supabase
    .from('elections')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCandidate(input, userId) {
  const slug = await uniqueCandidateSlug(input.election_id, slugify(input.full_name));
  const payload = {
    election_id: input.election_id,
    slug,
    full_name: input.full_name.trim(),
    registration_no: normalizeRegistrationNo(input.registration_no),
    position: input.position.trim(),
    message: input.message?.trim() || null,
    current_designation: input.current_designation?.trim() || null,
    institution: input.institution?.trim() || null,
    qualification: input.qualification?.trim() || null,
    profile_summary: input.profile_summary?.trim() || null,
    key_achievements: input.key_achievements?.trim() || null,
    agenda: input.agenda?.trim() || null,
    cv_path: input.cv_path || null,
    cv_file_name: input.cv_file_name || null,
    cv_mime_type: input.cv_mime_type || null,
    cv_size: input.cv_size || null,
    photo_url: input.photo_url || null,
    photo_path: input.photo_path || null,
    sort_order: Number(input.sort_order || 0),
    is_active: Boolean(input.is_active),
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('election_candidates')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function countVotesForElection(electionId) {
  if (!electionId) return 0;
  const { count, error } = await supabase
    .from('election_votes')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', electionId);
  if (error) throw error;
  return count || 0;
}

export async function countVotesForCandidate(candidateId) {
  if (!candidateId) return 0;
  const { count, error } = await supabase
    .from('election_votes')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_id', candidateId);
  if (error) throw error;
  return count || 0;
}

export async function deleteElection(id) {
  const voteDelete = await supabase.from('election_votes').delete().eq('election_id', id);
  if (voteDelete.error) throw voteDelete.error;

  const { error } = await supabase.from('elections').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveElection(id) {
  const { data, error } = await supabase
    .from('elections')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCandidate(id) {
  const { error } = await supabase.from('election_candidates').delete().eq('id', id);
  if (error) throw error;
}

export async function deactivateCandidate(id) {
  const { data, error } = await supabase
    .from('election_candidates')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCandidate(id, input) {
  const payload = {
    full_name: input.full_name.trim(),
    registration_no: normalizeRegistrationNo(input.registration_no),
    position: input.position.trim(),
    message: input.message?.trim() || null,
    current_designation: input.current_designation?.trim() || null,
    institution: input.institution?.trim() || null,
    qualification: input.qualification?.trim() || null,
    profile_summary: input.profile_summary?.trim() || null,
    key_achievements: input.key_achievements?.trim() || null,
    agenda: input.agenda?.trim() || null,
    sort_order: Number(input.sort_order || 0),
    is_active: Boolean(input.is_active),
  };

  if (input.photo_url !== undefined) payload.photo_url = input.photo_url || null;
  if (input.photo_path !== undefined) payload.photo_path = input.photo_path || null;
  if (input.cv_path !== undefined) payload.cv_path = input.cv_path || null;
  if (input.cv_file_name !== undefined) payload.cv_file_name = input.cv_file_name || null;
  if (input.cv_mime_type !== undefined) payload.cv_mime_type = input.cv_mime_type || null;
  if (input.cv_size !== undefined) payload.cv_size = input.cv_size || null;

  const { data, error } = await supabase
    .from('election_candidates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadCandidatePhoto(file) {
  if (!file) return { path: null, url: null };

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Photo upload failed. Use JPG, PNG or WebP only.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo upload failed. File must be under 5 MB.');
  }

  const uploaded = await uploadContentFile(file, {
    folder: 'elections/candidates',
    fallback: true,
  });

  return { path: uploaded.path, url: uploaded.url };
}

export async function uploadCandidateCv(file, electionId) {
  if (!file) return emptyCandidateCv();

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('CV upload failed. Use PDF, DOC, or DOCX only.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('CV upload failed. File must be under 10 MB.');
  }

  const folder = electionId ? `candidate-cvs/${electionId}` : 'candidate-cvs';
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from('election-documents')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return {
    cv_path: path,
    cv_file_name: file.name,
    cv_mime_type: file.type || null,
    cv_size: file.size || null,
  };
}

export async function getCandidateCvSignedUrl(path, expiresIn = 60 * 60) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from('election-documents')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data?.signedUrl || '';
}

export async function uploadVoterPhoto(userId, file) {
  if (!file) return { path: null };

  const path = `${userId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from('voter-photos')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return { path };
}

export async function getVoterPhotoSignedUrl(path) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from('voter-photos')
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function listElectionVotes(electionId) {
  if (!electionId) return [];

  const { data, error } = await supabase
    .from('election_votes')
    .select(`
      id,
      election_id,
      candidate_id,
      voter_id,
      voter_registration_no,
      created_at,
      election_candidates!election_votes_candidate_id_fkey (
        id,
        slug,
        full_name,
        position
      ),
      profiles!election_votes_voter_id_fkey (
        id,
        email,
        full_name,
        registration_no
      )
    `)
    .eq('election_id', electionId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((vote) => ({
    ...vote,
    candidate: vote.election_candidates,
    voter: vote.profiles,
  }));
}

export async function countActiveVoters() {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('is_active', true);

  if (error) throw error;
  return count || 0;
}

export function subscribeToElectionChanges({ electionId, voterId, onChange }) {
  if (!isSupabaseConfigured || !electionId) return () => {};

  const channel = supabase
    .channel(`election:${electionId}:${voterId || 'all'}:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'elections', filter: `id=eq.${electionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'election_candidates', filter: `election_id=eq.${electionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'election_votes', filter: `election_id=eq.${electionId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function countVotesByCandidate(votes = []) {
  return votes.reduce((counts, vote) => {
    counts[vote.candidate_id] = (counts[vote.candidate_id] || 0) + 1;
    return counts;
  }, {});
}

export function summarizeElectionVotes(election, votes = [], activeVoterCount = 0) {
  const counts = countVotesByCandidate(votes);
  const totalVotes = votes.length;
  const candidateStats = (election?.candidates || [])
    .map((candidate) => {
      const voteCount = counts[candidate.id] || 0;
      return {
        candidate,
        voteCount,
        percent: totalVotes ? Math.round((voteCount / totalVotes) * 100) : 0,
      };
    })
    .sort((a, b) => (b.voteCount - a.voteCount) || a.candidate.full_name.localeCompare(b.candidate.full_name));

  const leader = candidateStats[0] || null;
  const runnerUp = candidateStats[1] || null;
  const margin = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
  const turnoutPercent = activeVoterCount ? Math.round((totalVotes / activeVoterCount) * 100) : 0;

  return {
    totalVotes,
    activeVoterCount,
    turnoutPercent,
    candidateStats,
    leader,
    runnerUp,
    margin,
  };
}

function normalizeElectionRecord(record) {
  const candidates = (record.election_candidates || [])
    .slice()
    .sort((a, b) => (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name));

  return {
    ...record,
    candidates,
    election_candidates: undefined,
  };
}

async function uniqueElectionSlug(baseSlug) {
  const { data, error } = await supabase
    .from('elections')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) throw error;
  return uniqueSlug(baseSlug, data?.map((item) => item.slug) || []);
}

async function uniqueCandidateSlug(electionId, baseSlug) {
  const { data, error } = await supabase
    .from('election_candidates')
    .select('slug')
    .eq('election_id', electionId)
    .ilike('slug', `${baseSlug}%`);

  if (error) throw error;
  return uniqueSlug(baseSlug, data?.map((item) => item.slug) || []);
}

function uniqueSlug(baseSlug, existingSlugs) {
  const existing = new Set(existingSlugs);
  if (!existing.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

function safeFileName(name) {
  const fallback = `upload-${Date.now()}`;
  const clean = String(name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return clean || fallback;
}

function emptyCandidateCv() {
  return {
    cv_path: null,
    cv_file_name: null,
    cv_mime_type: null,
    cv_size: null,
  };
}
