import React from 'react'
import ComingSoon from '../components/common/ComingSoon'
import SEO from '../components/SEO'

const JournalSearch = () => {
  const searchIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-16 h-16 text-primary dark:text-gold"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      <circle cx="12" cy="12" r="3" />
      <path d="m14.5 14.5 2 2" />
    </svg>
  );

  return (
    <>
      <SEO 
        title="Journal Search" 
        description="Search our extensive collection of medical journals and research papers."
        keywords="journal search, medical research, pathology papers"
      />
      <ComingSoon 
        title="Journal Search" 
        description="We are building a powerful search engine for our extensive collection of medical journals. Soon you'll be able to find research papers, articles, and case studies with ease."
        icon={searchIcon}
        status="Coming Soon"
      />
    </>
  )
}

export default JournalSearch