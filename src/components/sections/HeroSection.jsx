import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link for the button
import Logo from '../../assets/logo.png';

// 1. Define animation variants for the container and its items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3, // This will make each child animate one after another
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

const HeroSection = () => {
  return (
    <section
      className="relative text-white bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: `url(${Logo})`
      }}
    >
      <div className="absolute inset-0 bg-primary opacity-60"></div>

      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 md:py-20 lg:py-24 relative z-10 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 max-w-4xl mx-auto text-shadow"
          variants={itemVariants}
        >
          Welcome to the <span className="text-gold-light">Delhi Chapter of Indian Association of Pathologists and Microbiologists</span> (DC-IAPM)
        </motion.h1>

        <motion.p
          className="hidden md:block text-lg md:text-xl font-semibold max-w-2xl mx-auto text-shadow-sm mb-6 md:mb-8"
          variants={itemVariants}
        >
          Fostering excellence in the field of Pathology through education, research, and collaboration.
        </motion.p>

        {/* 5. Call-to-Action (CTA) Button:
            - Added a button linking to the Membership page for a clear next step.
            - Styled it consistently with other buttons on the site (like in PresidentSection.jsx).
        */}
        <motion.div
          variants={itemVariants} // Animate as a child item
          whileHover={{ scale: 1.05, y: -2 }} // Consistent hover
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            to="/membership"
            className="inline-block text-primary font-bold py-3 px-8 rounded bg-[#D4AF37] dark:hover:bg-gold-light transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Become a Member
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default HeroSection;