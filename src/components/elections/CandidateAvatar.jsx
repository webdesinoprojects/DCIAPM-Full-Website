const CandidateAvatar = ({ candidate, size = 'md', className = '' }) => {
  const dimensions = {
    sm: 'h-12 w-12 text-sm',
    md: 'h-16 w-16 text-lg',
    lg: 'h-24 w-24 text-2xl',
  }[size] || 'h-16 w-16 text-lg';

  const initials = candidate?.full_name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'N';

  if (candidate?.photo_url) {
    return (
      <img
        src={candidate.photo_url}
        alt={candidate.full_name}
        className={`${dimensions} rounded-full object-cover border-2 border-gold-DEFAULT/40 bg-gray-100 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} rounded-full bg-primary text-white border-2 border-gold-DEFAULT/40 flex items-center justify-center font-bold ${className}`}
      aria-label={candidate?.full_name || 'Nominee'}
    >
      {initials}
    </div>
  );
};

export default CandidateAvatar;
