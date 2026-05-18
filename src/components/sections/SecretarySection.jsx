import { Link } from 'react-router-dom';
import DrPrasenjitDas from '../../assets/Dr-Prasenjit-Das,-Secrertary-General.jpg';
import { motion } from 'framer-motion';

const SecretarySection = () => {
  return (
    <motion.section
      className="py-16 lg:py-24 bg-white dark:bg-background-dark"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12">
          <motion.div
            className="md:w-1/3 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img
              className="w-64 h-64 rounded-full mx-auto object-contain border-4 border-gold shadow-xl"
              src={DrPrasenjitDas}
            />
            <h3 className="font-display text-2xl font-bold text-primary dark:text-white mt-6">
              Dr Prasenjit Das
            </h3>
            <p className="text-gold-DEFAULT dark:text-gold-light font-semibold">
              Secretary
            </p>
            <p className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-200 mt-1">
              DC-IAPM
            </p>
          </motion.div>

          <div className="md:w-2/3">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary dark:text-white mb-4 text-center md:text-left">
              Message from the Secretary
            </h2>
            <div className="w-24 h-1 bg-gold-DEFAULT mb-6 mx-auto md:mx-0"></div>
            <p className="text-gray-600 dark:text-gray-200 mb-2 text-justify">
              Dear Colleagues,
            </p>
            <p className="text-gray-600 dark:text-gray-200 mb-6 leading-relaxed text-justify">
              "It gives me great pleasure to share an update from the Delhi Chapter of the Indian Association of Pathologists and Microbiologists (DC-IAPM)."
            </p>
            <motion.div
              whileHover={{ scale: 0.95 }}
              whileTap={{ scale: 0.95 }}
              className="text-center md:text-left"
            >
              <Link
                to="/secretary-message"
                className="inline-block text-primary font-bold py-3 px-8 rounded bg-[#D4AF37] dark:hover:bg-gold-light transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Read Full Message
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default SecretarySection;