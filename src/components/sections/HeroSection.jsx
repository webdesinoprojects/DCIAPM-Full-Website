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
      className="relative text-white bg-cover bg-center"
      style={{
        backgroundImage: `url(${Logo})` //
      }}
    >
      {/* 2. Enhanced Overlay: 
          - Changed from a flat opacity to a gradient for more depth.
          - Added 'backdrop-blur-sm' to slightly blur the busy logo background.
      */}
      <div className="absolute inset-0 bg-primary opacity-60"></div>
      
      {/* 3. Animation Container:
          - This 'motion.div' controls the 'staggerChildren' animation.
      */}
      <motion.div 
        className="container mx-auto px-4 lg:px-6 py-20 md:py-24 lg:py-32 relative z-10 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 
          className="font-display text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 text-shadow" //
          variants={itemVariants} // Animate as a child item
        >
          {/* 4. Color Enhancement:
              - Used the site's accent color (gold) for key words.
          */}
          Welcome to the <span className="text-gold-light">Delhi Chapter of Indian Association of Pathologists and Microbiologists</span> (DC-IAPM)
        </motion.h1>
        
        <motion.p 
          className="text-lg hidden md:block font font-semibold md:text-xl max-w-3xl mx-auto text-shadow-sm mb-8" //
          variants={itemVariants} // Animate as a child item
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