import { electionRuntimeStatus } from '../../lib/elections';

const statusStyles = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  active: 'bg-green-50 text-green-700 border-green-100',
  closed: 'bg-red-50 text-red-700 border-red-100',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const labels = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
  unknown: 'Unknown',
};

const ElectionStatusPill = ({ election, status }) => {
  const runtimeStatus = status || electionRuntimeStatus(election);

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[runtimeStatus] || statusStyles.unknown}`}>
      {labels[runtimeStatus] || labels.unknown}
    </span>
  );
};

export default ElectionStatusPill;
