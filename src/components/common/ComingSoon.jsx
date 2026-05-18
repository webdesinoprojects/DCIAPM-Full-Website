import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ComingSoon = ({ title, description, icon, status }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center bg-background-light dark:bg-background-dark relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-gold/5 blur-3xl"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-gold/10 dark:bg-primary/10 blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl mx-auto relative z-10"
      >
        {/* Icon Container */}
        <div className="mb-8 flex justify-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-gold/20 dark:from-primary/40 dark:to-gold/40 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative w-32 h-32 bg-white dark:bg-card-dark rounded-full shadow-2xl flex items-center justify-center border border-border-light dark:border-border-dark group-hover:scale-105 transition-transform duration-500">
              {icon || (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-14 h-14 text-primary dark:text-gold"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              )}
            </div>
          </motion.div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 dark:bg-gold/10 border border-primary/10 dark:border-gold/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary dark:bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary dark:bg-gold"></span>
            </span>
            <span className="text-sm font-bold text-primary dark:text-gold uppercase tracking-widest">
              {status || "Coming Soon"}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-display font-bold text-primary dark:text-heading-dark mb-6 tracking-tight">
          {title || "Coming Soon"}
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-text-muted-light dark:text-text-muted-dark mb-12 max-w-2xl mx-auto leading-relaxed">
          {description || "We are currently crafting this experience. Please check back later for updates."}
        </p>

        {/* Action Button */}
        <Link 
          to="/" 
          className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg hover:shadow-xl overflow-hidden"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
          <span className="relative flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Return to Home
          </span>
        </Link>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
