import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const QuickLinksSection = () => {

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
  };

  const quickLinks = [
    {
      title: "President's Message",
      description: "Read a welcoming address from our esteemed President, Prof (Dr) Sonal Sharma.",
      link: "/president-message",
      linkText: "Read More"
    },
    {
      title: "Become a Member",
      description: "Join a vibrant community of professionals. Access exclusive resources, events, and networking opportunities.",
      link: "/membership",
      linkText: "Join Us Today"
    },
    {
      title: "Events",
      description: "Stay updated with our latest conferences, workshops, and webinars. Enhance your knowledge and skills.",
      link: "/academics-events",
      linkText: "Explore Events"
    }
  ];

  return (
    <motion.section 
      className="py-16 lg:py-24 bg-background-light dark:bg-primary"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary dark:text-white mb-4">
            Quick Links
          </h2>
          <div className="w-24 h-1 bg-gold-DEFAULT mx-auto"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {quickLinks.map((item, i) => (
            <motion.div
              key={i}
              className="bg-white dark:bg-background-dark p-8 rounded-lg shadow-md text-center border-t-4 border-gold-DEFAULT transform hover:-translate-y-2 transition-transform duration-300"
              custom={i}
              variants={cardVariants}
            >
              <h3 className="font-display text-2xl font-bold text-primary dark:text-white mb-4">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-justify md:text-center hyphens-auto">
                {item.description}
              </p>
              <Link to={item.link} className="font-bold text-primary dark:text-gold-light hover:underline">
                {item.linkText}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

export default QuickLinksSection;