import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import DrPrasenjitDas from '../assets/Dr-Prasenjit-Das,-Secrertary-General.jpg';

const SecretaryMessage = () => {
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
                src={DrPrasenjitDas}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="text-center sm:text-left pt-4">
              <h2 className="text-3xl font-bold font-display text-primary dark:text-white">
                Dr Prasenjit Das
              </h2>
              <p className="text-lg text-text-muted-light dark:text-text-muted-dark mt-2">
                Secretary, DC-IAPM
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
            <p>
              Secretary's Message
            </p>
            &nbsp;

            <p>
              Dear Colleagues,
            </p>
            &nbsp;
            <p>
              It gives me great pleasure to share an update from the Delhi Chapter of the Indian Association of Pathologists and Microbiologists (DC-IAPM). While our Chapter was formally registered in 2025, our academic spirit and collegial network have remained active for the last couple of decades, built on the steady commitment of our seniors and the continued participation of members across institutions in Delhi and the NCR region.
            </p>
            &nbsp;
            <p>
              In the current year, we have renewed our focus on regular, high-quality academic engagement. New and more active academic activities are being rolled out in the form of quarterly scientific sessions, and mid-year CME designed to be relevant for both early-career colleagues and experienced practitioners. We also had the first Annual Conference of the registered DC-IAPM in the first week of March 2026, envisioned as a flagship event that brought together pathologists and microbiologists from across the region for scientific deliberations, guest lectures, free paper and poster presentations, and meaningful peer interaction. We look forward to many more academic meetings in coming days.
            </p>
            &nbsp;
            <p>
              A key administrative initiative this year is to unify and update our legacy member records. Many colleagues have been associated with the Chapter over the years, and we are working to consolidate the old members list, verify contact details, and ensure that every member is connected to upcoming communications and activities. I request all members, especially our senior colleagues and institutional representatives, to support this effort by sharing updated information and helping us reach members who may have changed workplaces or contact numbers. We are also making a professional interactive website for members intimation, updates and membership applications.
            </p>
            &nbsp;
            <p>
              With your continued guidance and support, DC-IAPM will remain a vibrant forum for learning, collaboration, and professional excellence, following the footprints of our national body, IAPM.
            </p>
            &nbsp;
            <p>
              Looking forward to your feedback and ideas for taking this chapter forward.
            </p>
            &nbsp;
            <p>
              Warm regards,<br />
              <strong>Dr Prasenjit Das</strong><br />
              Secretary<br />
              DC-IAPM
            </p>
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
};

export default SecretaryMessage;
