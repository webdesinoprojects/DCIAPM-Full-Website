import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { UserCircle2 } from 'lucide-react';
import SEO from '../components/SEO';
import { listGoverningBodyMembers } from '../lib/content';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const OfficerCard = ({ member }) => (
  <motion.div
    className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
    whileHover={{ scale: 1.02, y: -4, boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="mx-auto mb-4 h-32 w-32">
      {member.image_url ? (
        <img src={member.image_url} alt={member.name} className="h-full w-full rounded-full border-2 border-gold object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-gold bg-gray-50">
          <UserCircle2 size={64} className="text-gray-400" aria-hidden="true" />
        </div>
      )}
    </div>
    <h3 className="mb-1 text-lg font-bold text-primary dark:text-white">{member.name}</h3>
    <p className="text-sm text-gray-700 dark:text-gray-300">{member.position}</p>
    {member.registration_no && <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500">{member.registration_no}</p>}
    <p className="mt-1 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">DC-IAPM</p>
  </motion.div>
);

const BodyMemberCard = ({ member }) => (
  <motion.div
    className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
    whileHover={{ scale: 1.02, y: -3, boxShadow: '0px 8px 12px -3px rgba(0,0,0,0.08)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
      {member.image_url ? (
        <img src={member.image_url} alt={member.name} className="h-full w-full object-cover" />
      ) : (
        <UserCircle2 size={44} className="text-gray-400 dark:text-gray-300" aria-hidden="true" />
      )}
    </div>
    <h3 className="mb-1 text-base font-bold text-primary dark:text-white">{member.name}</h3>
    <p className="text-sm text-gray-700 dark:text-gray-300">{member.position}</p>
  </motion.div>
);

const GoverningBody = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembers = useCallback(() => {
    setError('');
    listGoverningBodyMembers()
      .then((rows) => setMembers(rows))
      .catch((error) => {
        console.error('Unable to load governing body members:', error);
        setError('Unable to load governing body members.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadMembers();

    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('public-governing-body-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'governing_body_members' }, loadMembers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMembers]);

  const { officeBearers, bodyMembers } = useMemo(() => {
    const activeOfficeBearers = members.filter((member) => member.section === 'office_bearer');
    const activeBodyMembers = members.filter((member) => member.section === 'governing_member');
    return {
      officeBearers: activeOfficeBearers,
      bodyMembers: activeBodyMembers,
    };
  }, [members]);

  return (
    <motion.div
      className="min-h-screen bg-background-light dark:bg-background-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SEO
        title="Governing Body"
        description="Meet the office bearers and governing body members of DC-IAPM."
        keywords="DC-IAPM governing body, pathology leadership, IAPM Delhi"
      />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            <section className="mb-16">
              <motion.div
                className="relative mb-8 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white md:text-4xl">
                  Office Bearers
                </h1>
                <div className="absolute inset-x-0 bottom-[-8px] mx-auto h-0.5 w-20 bg-gold-DEFAULT" />
              </motion.div>

              <motion.div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {loading && <SectionState text="Loading office bearers..." />}
                {!loading && error && <SectionState text={error} tone="error" />}
                {!loading && !error && officeBearers.length === 0 && <SectionState text="No office bearers have been published yet." />}
                {!loading && !error && officeBearers.map((member, index) => (
                  <motion.div key={member.id} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.04 }}>
                    <OfficerCard member={member} />
                  </motion.div>
                ))}
              </motion.div>
            </section>

            <section>
              <div className="relative mb-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-white md:text-4xl">
                  Governing Body Members
                </h2>
                <div className="absolute inset-x-0 bottom-[-8px] mx-auto h-0.5 w-20 bg-gold-DEFAULT" />
              </div>

              <motion.div
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              >
                {loading && <SectionState text="Loading governing body members..." />}
                {!loading && error && <SectionState text={error} tone="error" />}
                {!loading && !error && bodyMembers.length === 0 && <SectionState text="No governing body members have been published yet." />}
                {!loading && !error && bodyMembers.map((member, index) => (
                  <motion.div key={member.id} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.035 }}>
                    <BodyMemberCard member={member} />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const SectionState = ({ text, tone = 'muted' }) => (
  <div className={`col-span-full rounded-lg border p-8 text-center text-sm font-semibold ${tone === 'error' ? 'border-red-100 bg-red-50 text-red-700' : 'border-dashed border-gray-200 bg-white text-gray-500'}`}>
    {text}
  </div>
);

export default GoverningBody;
