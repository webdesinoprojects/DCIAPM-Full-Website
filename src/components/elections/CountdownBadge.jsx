import { useEffect, useMemo, useState } from 'react';
import { electionRuntimeStatus } from '../../lib/elections';

const CountdownBadge = ({ election }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const content = useMemo(() => {
    const runtimeStatus = electionRuntimeStatus(election);
    const startsAt = election?.starts_at ? new Date(election.starts_at).getTime() : null;
    const endsAt = election?.ends_at ? new Date(election.ends_at).getTime() : null;

    if (runtimeStatus === 'scheduled' && startsAt) {
      return { label: 'Starts in', value: formatRemaining(startsAt - now), tone: 'blue' };
    }

    if (runtimeStatus === 'active' && endsAt) {
      return { label: 'Ends in', value: formatRemaining(endsAt - now), tone: 'green' };
    }

    if (runtimeStatus === 'closed') {
      return { label: 'Status', value: 'Ended', tone: 'red' };
    }

    if (runtimeStatus === 'draft') {
      return { label: 'Status', value: 'Draft', tone: 'gray' };
    }

    return { label: 'Status', value: 'Open', tone: 'green' };
  }, [election, now]);

  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${toneClasses[content.tone]}`}>
      <span className="text-xs uppercase tracking-wide opacity-70">{content.label}</span>
      {content.value}
    </span>
  );
};

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export default CountdownBadge;
