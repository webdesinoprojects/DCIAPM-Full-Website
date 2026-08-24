import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import LeadershipMessageBody from '../components/leadership/LeadershipMessageBody';
import { useLeadershipMessage } from '../hooks/useLeadershipMessage';

const SecretaryMessage = () => {
  const secretary = useLeadershipMessage('secretary');

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <SEO 
        title="Secretary's Message" 
        description="Read the message from the Secretary of Delhi Chapter IAPM."
        keywords="secretary message, Delhi Chapter IAPM, pathology society leadership"
      />
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Profile Section */}
          <motion.div
            className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-12 pb-12 border-b border-border-light dark:border-border-dark"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-shrink-0">
              <motion.img
                className="w-40 h-40 rounded-full object-contain shadow-lg border-4 border-gold"
                src={secretary.image_url}
                alt={secretary.name}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="text-center sm:text-left pt-4">
              <h2 className="text-3xl font-bold font-display text-primary dark:text-white">
                {secretary.name}
              </h2>
              <p className="text-lg text-text-muted-light dark:text-text-muted-dark mt-2">
                {secretary.designation}, {secretary.organization}
              </p>
            </div>
          </motion.div>

          {/* Message Section */}
          <motion.div
            className="prose prose-lg max-w-none dark:prose-invert text-justify"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <LeadershipMessageBody message={secretary.message} />
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
};

export default SecretaryMessage;
