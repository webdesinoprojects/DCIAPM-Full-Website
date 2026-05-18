import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.png';
import { motion } from 'framer-motion';

const Footer = () => {

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <motion.footer 
      className="bg-primary text-white"
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Column 1: Society Info */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center space-x-3 mb-4">
              <img
                alt="DC-IAPM Logo"
                className="h-14 w-14"
                src={Logo}
              />
              <h3 className="font-display text-lg font-bold">DC-IAPM</h3>
            </div>
            <p className="text-sm text-gray-300">
              Delhi Chapter of Indian Association of Pathologists and Microbiologists.
            </p>
          </motion.div>

          {/* Column 2: About Us */}
          <motion.div variants={itemVariants}>
            <h3 className="font-display text-lg font-bold mb-4">About Us</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about-us" className="text-gray-300 hover:text-gold-light transition-colors">
                  Our Mission & Vision
                </Link>
              </li>
              <li>
                <Link to="/governing-body" className="text-gray-300 hover:text-gold-light transition-colors">
                  Governing Body
                </Link>
              </li>
              <li>
                <Link to="/president-message" className="text-gray-300 hover:text-gold-light transition-colors">
                  President's Message
                </Link>
              </li>
              <li>
                <Link to="/secretary-message" className="text-gray-300 hover:text-gold-light transition-colors">
                  Secretary General's Message
                </Link>
              </li>

            </ul>
          </motion.div>

          {/* Column 3: Quick Links */}
          <motion.div variants={itemVariants}>
            <h3 className="font-display text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/academics-events" className="text-gray-300 hover:text-gold-light transition-colors">
                  Academics & Events
                </Link>
              </li>
              <li>
                <Link to="/publications" className="text-gray-300 hover:text-gold-light transition-colors">
                  Publications
                </Link>
              </li>
              <li>
                <Link to="/membership" className="text-gray-300 hover:text-gold-light transition-colors">
                  Membership
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="text-gray-300 hover:text-gold-light transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Column 4: Contact */}
          <motion.div variants={itemVariants}>
            <h3 className="font-display text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-300">
                78, LD Block, PITAMPURA,<br />New Delhi-110034
              </li>
              <li className="text-gray-300">
                Email: <a href="mailto:dciapmdciapm@gmail.com" className="text-gold-light hover:underline">dciapmdciapm@gmail.com</a>
              </li>
              <li className="text-gray-300">
                Phone: <a href="tel:+919873898110" className="text-gold-light hover:underline">9873898110</a>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; 2026 Delhi Chapter of Indian Association of Pathologists and Microbiologists (DC-IAPM). All Rights Reserved.</p>
          
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer;