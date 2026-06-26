import { isSupabaseConfigured, supabase } from './supabase';
import { uploadContentFile } from './contentUpload';

export const electionStatuses = ['draft', 'scheduled', 'active', 'closed', 'archived'];

export const voteMessages = {
  VOTE_RECORDED: 'Your vote has been recorded.',
  ALREADY_VOTED: 'You have already voted for this nominee.',
  POSITION_VOTE_LIMIT_REACHED: 'You have already used the allowed votes for this post.',
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

export const defaultElectionVoteLimits = [
  { position_key: 'president', position_label: 'President', max_votes: 1, sort_order: 10 },
  { position_key: 'vice_president', position_label: 'Vice President', max_votes: 1, sort_order: 20 },
  { position_key: 'secretary_general', position_label: 'Secretary General', max_votes: 1, sort_order: 30 },
  { position_key: 'joint_secretary', position_label: 'Joint Secretary', max_votes: 1, sort_order: 40 },
  { position_key: 'treasurer', position_label: 'Treasurer', max_votes: 1, sort_order: 50 },
  { position_key: 'ec_member', position_label: 'EC Member', max_votes: 1, sort_order: 60 },
];

export function electionPositionKey(position) {
  const normalized = String(position || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) return 'general';
  if (/(^| )ec( |$)/.test(normalized) || normalized.includes('executive committee')) return 'ec_member';
  if (normalized.includes('vice') && normalized.includes('president')) return 'vice_president';
  if (normalized.includes('president')) return 'president';
  if (normalized.includes('secretary') && normalized.includes('general')) return 'secretary_general';
  if (normalized.includes('joint') && normalized.includes('secretary')) return 'joint_secretary';
  if (normalized.includes('treasurer')) return 'treasurer';
  return normalized.replace(/\s+/g, '_');
}

export function getElectionVoteLimit(election, position) {
  const key = electionPositionKey(position);
  const limit = (election?.vote_limits || defaultElectionVoteLimits).find((item) => item.position_key === key);
  return Math.min(15, Math.max(1, Number(limit?.max_votes || 1)));
}

function emptyVoteGroup() {
  return { all: [], byCandidate: {}, byPosition: {} };
}

export function normalizeVoteGroup(vote) {
  if (!vote) return emptyVoteGroup();
  if (Array.isArray(vote.all)) return vote;

  const key = vote.position_key || electionPositionKey(vote.candidate?.position);
  return {
    ...vote,
    all: [vote],
    byCandidate: { [vote.candidate_id]: vote },
    byPosition: { [key]: [vote] },
  };
}

export function electionRuntimeStatus(election) {
  if (!election) return 'unknown';
  if (election.status === 'draft' || election.status === 'archived' || election.status === 'closed') return election.status;

  const now = Date.now();
  const startsAt = election.starts_at ? new Date(election.starts_at).getTime() : null;
  const endsAt = election.ends_at ? new Date(election.ends_at).getTime() : null;

  if (endsAt && now > endsAt) return 'closed';
  if (startsAt && now < startsAt) return 'scheduled';
  if (election.status === 'scheduled' && !startsAt) return 'scheduled';
  if (election.status === 'scheduled' || election.status === 'active') return 'active';
  return election.status;
}

export function canVoteInElection(election, profile, vote, candidate = null) {
  const runtimeStatus = electionRuntimeStatus(election);
  const completeProfile = Boolean(profile?.full_name && profile?.registration_no && profile?.photo_path);
  const voteGroup = normalizeVoteGroup(vote);
  const positionKey = candidate ? electionPositionKey(candidate.position) : null;
  const candidateVote = candidate ? voteGroup.byCandidate?.[candidate.id] : null;
  const positionVotes = positionKey ? voteGroup.byPosition?.[positionKey] || [] : [];
  const maxVotes = candidate ? getElectionVoteLimit(election, candidate.position) : null;
  const positionLimitReached = Boolean(candidate && positionVotes.length >= maxVotes);

  return {
    allowed: runtimeStatus === 'active' && completeProfile && !candidateVote && !positionLimitReached,
    runtimeStatus,
    completeProfile,
    candidateVote,
    positionKey,
    positionVotes,
    maxVotes,
    positionLimitReached,
    reason: candidateVote
      ? 'You have already voted for this nominee.'
      : positionLimitReached
        ? `You have already used ${maxVotes} vote${maxVotes === 1 ? '' : 's'} for ${candidate.position}.`
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
      ),
      election_vote_limits (
        id,
        position_key,
        position_label,
        max_votes,
        sort_order
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
      ),
      election_vote_limits (
        id,
        position_key,
        position_label,
        max_votes,
        sort_order
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
      position_key,
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

  return (data || []).reduce((votes, row) => {
    const vote = {
      ...row,
      candidate: row.election_candidates,
    };
    const positionKey = vote.position_key || electionPositionKey(vote.candidate?.position);
    const group = votes[vote.election_id] || emptyVoteGroup();

    group.all.push(vote);
    group.byCandidate[vote.candidate_id] = vote;
    group.byPosition[positionKey] = [...(group.byPosition[positionKey] || []), vote];

    votes[vote.election_id] = group;
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

export async function updateElectionVoteLimits(electionId, limits = []) {
  if (!electionId) throw new Error('Election is required.');

  const payload = limits.map((limit, index) => ({
    election_id: electionId,
    position_key: limit.position_key,
    position_label: limit.position_label,
    max_votes: Math.min(15, Math.max(1, Number(limit.max_votes || 1))),
    sort_order: Number(limit.sort_order ?? index * 10),
  }));

  const { data, error } = await supabase
    .from('election_vote_limits')
    .upsert(payload, { onConflict: 'election_id,position_key' })
    .select();

  if (error) throw error;
  return data || [];
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
      position_key,
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
      { event: '*', schema: 'public', table: 'election_vote_limits', filter: `election_id=eq.${electionId}` },
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
  const votersParticipated = new Set(votes.map((vote) => vote.voter_id).filter(Boolean)).size;
  const turnoutPercent = activeVoterCount ? Math.round((votersParticipated / activeVoterCount) * 100) : 0;

  return {
    totalVotes,
    votersParticipated,
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
  const loadedLimits = (record.election_vote_limits || [])
    .slice()
    .sort((a, b) => (a.sort_order - b.sort_order) || a.position_label.localeCompare(b.position_label));
  const limitMap = new Map(defaultElectionVoteLimits.map((limit) => [limit.position_key, { ...limit }]));
  loadedLimits.forEach((limit) => limitMap.set(limit.position_key, { ...limit, max_votes: Number(limit.max_votes || 1) }));

  return {
    ...record,
    candidates,
    vote_limits: Array.from(limitMap.values()).sort((a, b) => (a.sort_order - b.sort_order) || a.position_label.localeCompare(b.position_label)),
    election_candidates: undefined,
    election_vote_limits: undefined,
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



