import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import DrSonalSharma from '../assets/Dr Sonal Sharma, President.jpg';

const PresidentMessage = () => {
    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <SEO 
                title="President's Message" 
                description="Read the message from the President of the Delhi Chapter, IAPM."
                keywords="president message, Delhi Chapter IAPM, pathology society leadership"
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
                                src={DrSonalSharma}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            />
                        </div>
                        <div className="text-center sm:text-left pt-4">
                            <h2 className="text-3xl font-bold font-display text-primary dark:text-white">
                                Prof (Dr) Sonal Sharma
                            </h2>
                            <p className="text-lg text-text-muted-light dark:text-text-muted-dark mt-2">
                                President, Delhi Chapter IAPM
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
                            It gives me immense pleasure and pride to address you through the official website of the Delhi Chapter of the Indian Association of Pathologists and Microbiologists.
                        </p>
                        &nbsp;
                        <p>
                            The Delhi Chapter has consistently upheld the highest standards of academic excellence, professional integrity, and collaborative spirit. We remain committed to advancing the science and practice of Pathology and Microbiology through continuous education, research initiatives, and meaningful academic interactions.
                        </p>
                        &nbsp;
                        <p>
                            In an era of rapidly evolving diagnostic technologies and precision medicine, the role of pathologists has become more crucial than ever. Our chapter aims to provide a vibrant platform for knowledge exchange, skill enhancement, and mentorship - particularly for our postgraduate students and young colleagues who represent the future of our specialty.
                        </p>
                        &nbsp;
                        <p>
                            Through conferences, CMEs, workshops, and interdisciplinary collaborations, we strive to foster innovation while maintaining the core values of ethics and patient-centered care. This website will serve as a dynamic medium to share updates, academic resources, upcoming events, and achievements of our esteemed members.
                        </p>
                        &nbsp;
                        <p>
                            I invite all members to actively participate, contribute, and engage in the activities of the Delhi Chapter. Together, let us continue to strengthen our professional community and uphold the legacy of excellence associated with our association.
                        </p>
                        &nbsp;
                        <p>
                            With warm regards,<br />
                            <strong>Prof (Dr) Sonal Sharma</strong><br />
                            President, Delhi Chapter IAPM
                        </p>
                    </motion.div>
                </div>
            </div>
        </motion.main>
    );
};

export default PresidentMessage;
