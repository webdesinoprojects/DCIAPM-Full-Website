import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import LeadershipMessageBody from '../components/leadership/LeadershipMessageBody';
import { useLeadershipMessage } from '../hooks/useLeadershipMessage';

const AboutUs = () => {
  const vicePresident = useLeadershipMessage('vice_president');

  return (
    <motion.main 
      className="container mx-auto px-6 py-12 md:py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <SEO 
        title="About Us" 
        description="Learn about the mission, vision, and roles of the Delhi Chapter of Indian Association of Pathologists and Microbiologists."
        keywords="about DC-IAPM, pathology mission, IAPM Delhi chapter"
      />
      {/* Page Header */}
      <div className="text-center mb-16">
        <motion.h1 
          className="text-4xl md:text-5xl font-bold font-display text-accent-blue dark:text-white mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          About Us
        </motion.h1>
        <motion.p 
          className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-400"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Understanding DC-IAPM - our purpose, goals, and guiding principles.
        </motion.p>
      </div>

      {/* Main Content Sections - Swapped Layout */}
      <div className="space-y-12">

        {/* First Row: Mission & Role */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          {/* Our Mission */}
          <div className="bg-secondary-light dark:bg-secondary-dark p-8 rounded-lg shadow-sm h-full flex flex-col">
            <h2 className="text-3xl font-bold font-display text-accent-blue dark:text-white mb-4">
              Our Mission
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
             The DC-IAPM is a state chapter of the Indian Association of Pathologists and Microbiologists (IAPM), registered on 3rd July 2025. Our mission is to advance the standards of pathology education, training, and research through cooperation and achieve the upbringing of all medical establishments in the NCT of Delhi, as per the aims and objectives of the IAPM. We are committed to organize academic programs such as continuous medical education, workshops, and conferences led by experts in the field. By nurturing the young minds and fostering academic networks we aim to encourage multi-institutional partnerships and research. We also strive to collaborate with practising pathologists and patients and work together for collective growth.
            </p>
          </div>

          {/* Our Role (Moved Up) */}
          <div className="bg-secondary-light dark:bg-secondary-dark p-8 rounded-lg shadow-sm h-full flex flex-col">
            <h2 className="text-3xl font-bold font-display text-accent-blue dark:text-white mb-4">
              Our Roles
            </h2>
            <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed ">
              <p><b>As a state chapter of the IAPM, the roles of DC-IAPM are:</b></p>
              <ul className="text-justify list-disc pl-6 mt-3 space-y-2">
                <li>Work in consultation and collaboration with the IAPM and follow its by-laws.</li>
                <li>Organize continuous academic activities for faculties, postgraduate students, fellows and practising pathologists.</li>
                <li>Provide a platform for pathologists working in the NCT of Delhi to come together to update knowledge and skills, exchange ideas, network, and learn about latest innovations and developments.</li>
                <li>Facilitate training and research in collaboration with IAPM and other specialty societies.</li>
                <li>Communicate with members and notify academic programs and developments through the website and posts.</li>
                <li>Share academic event reports with the IAPM for evaluation of chapter activities.</li>
                <li>Coordinate with IAPM and facilitate national initiatives such as National UG Quiz, National PG Quiz, surveys, etc.</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Vice President Message */}
        <motion.div
          id="vice-president-message"
          className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-8 shadow-sm"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3 text-center">
              <img
                src={vicePresident.image_url}
                alt={vicePresident.name}
                className="w-40 h-40 md:w-48 md:h-48 rounded-full mx-auto object-contain border-4 border-gold shadow-lg"
              />
              <h3 className="font-display text-2xl font-bold text-primary dark:text-white mt-5">
                {vicePresident.name}
              </h3>
              <p className="text-gold-DEFAULT dark:text-gold-light font-semibold">{vicePresident.designation}</p>
              <p className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-200 mt-1">{vicePresident.organization}</p>
            </div>
            <div className="md:w-2/3">
              <h2 className="text-3xl font-bold font-display text-accent-blue dark:text-white mb-4 text-center md:text-left">
                Message from the Vice President
              </h2>
              <div className="space-y-4">
                <LeadershipMessageBody
                  message={vicePresident.message}
                  paragraphClassName="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-justify"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Second Row: Objectives & Vision */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Our Vision (Moved Down) */}
          <div className="bg-secondary-light dark:bg-secondary-dark p-8 rounded-lg shadow-sm h-full flex flex-col">
            <h2 className="text-3xl font-bold font-display text-accent-blue dark:text-white mb-4">
              Our Vision
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
             Our vision is to create an informed and skilled pathology workforce in the NCT of Delhi, so that pathologists working in this NCT can deliver highest quality. We strive to collaborate with IAPM, other specialty societies, institutes and professionals to arrange high quality career development programs and trainings. When we train and educate ourselves, we can envision deficiencies and strive to upgrade our infrastructure and training. By nurturing emerging talents and continuously improving educational standards, we aspire to be a leading force in enhancing healthcare outcomes not only in the NCT of Delhi, but in the whole country.
            </p>
          </div>
          
          {/* Our Constitution */}
          <div className="bg-accent-blue dark:bg-secondary-dark p-8 rounded-lg shadow-sm h-full flex flex-col">
            <h2 className="text-3xl font-bold font-display text-white mb-4">
              Our Constitution
            </h2>
            <p className="text-base text-gray-300 dark:text-gray-300 leading-relaxed text-justifymb-6">
              The constitution of DC-IAPM outlines the framework, rules, and regulations
              that govern our society. It details our objectives, membership criteria, governance structure,
              and the responsibilities of our office-bearers. We encourage all members and prospective
              members to familiarize themselves with this important document.
            </p>
            &nbsp;
            <motion.a 
              href="/constitution_of_society.pdf" 
              download="DC-IAPM_Constitution.pdf"
              className="inline-flex items-center justify-center px-8 py-3 text-accent-blue font-bold rounded-md bg-[#D4AF37] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background-dark mt-auto"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-icons mr-2">download</span>
              Download Constitution
            </motion.a>
          </div>
        </motion.div>
      </div>
    </motion.main>
  )
}

export default AboutUs;
