import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.png'
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

const Header = ({ currentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [isMenuOpen]);

  const menuVariants = {
    hidden: {
      x: '100%',
      transition: {
        type: 'tween',
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    visible: {
      x: 0,
      transition: {
        type: 'tween',
        duration: 0.4,
        ease: 'easeIn',
      },
    },
    exit: {
      x: '100%',
      transition: {
        type: 'tween',
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const navLinkVariants = {
    hover: {
      scale: 1.05,
      color: '#d4af37',
      originX: 0,
    },
    tap: {
      scale: 0.95,
    },
  };

  const mobileNavLinkVariants = {
    hidden: {
      y: 20,
      opacity: 0,
    },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    }),
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', page: 'home', icon: 'home' },
    {
      label: 'About Us',
      page: 'about-us',
      dropdown: [
        { to: '/about-us', label: 'Our Mission & Vision', icon: 'info' },
        { to: '/president-message', label: "President's Message", icon: 'person' },
        { to: '/about-us#vice-president-message', label: "Vice President's Message", icon: 'person_outline' },
        { to: '/secretary-message', label: "Secretary General's Message", icon: 'person_outline' },
      ],
    },
    { to: '/governing-body', label: 'Governing Body', page: 'governing-body', icon: 'groups' },
    // 1. === MODIFICATION START ===
    // Change Membership from a single link to a dropdown
    {
      label: 'Membership',
      page: 'membership', // This will highlight for /membership and /members-details
      dropdown: [
        { to: '/membership', label: 'Become a Member', icon: 'card_membership' },
        { to: '/members-directory', label: 'Member Directory', icon: 'list_alt' },
      ],
    },
    // { to: '/membership', label: 'Membership', page: 'membership', icon: 'card_membership' }, // This line is replaced
    // 1. === MODIFICATION END ===
    {
      label: 'Academics & Events',
      page: 'academics_events', // Base page key for highlighting
      dropdown: [
        { to: '/academics-events', label: 'Upcoming Events', icon: 'school' },
        { to: '/journal-search', label: 'Journal Search', icon: 'find_in_page' },
        { to: '/case-of-the-month', label: 'Case of the Month', icon: 'quiz' },
      ],
    },
    { to: '/publications', label: 'Publications', page: 'publications', icon: 'article' },
    { to: '/gallery', label: 'Gallery', page: 'gallery', icon: 'photo_library' },
    { to: '/contact-us', label: 'Contact Us', page: 'contact-us', icon: 'contact_mail' },
  ];

  const mobileNavLinks = [
    { to: '/', label: 'Home', page: 'home', icon: 'home' },
    { to: '/about-us', label: 'About Us', page: 'about-us', icon: 'info' },
    { to: '/governing-body', label: 'Governing Body', page: 'governing-body', icon: 'groups' },
    { to: '/president-message', label: "President's Message", page: 'president-message', icon: 'person' },
    { to: '/about-us#vice-president-message', label: "Vice President's Message", page: 'about-us', icon: 'person_outline' },
    { to: '/secretary-message', label: "Secretary General's Message", page: 'secretary-message', icon: 'person_outline' },
    // 2. === MODIFICATION START ===
    // Update mobile links
    { to: '/membership', label: 'Become a Member', page: 'membership', icon: 'card_membership' },
    { to: '/members-directory', label: 'Member Directory', page: 'members-directory', icon: 'list_alt' },
    // { to: '/membership', label: 'Membership', page: 'membership', icon: 'card_membership' }, // This line is replaced
    // 2. === MODIFICATION END ===
    { to: '/academics-events', label: 'Upcoming Events', page: 'academics-events', icon: 'school' },
    { to: '/journal-search', label: 'Journal Search', page: 'journal-search', icon: 'find_in_page' },
    { to: '/case-of-the-month', label: 'Case of the Month', page: 'case-of-the-month', icon: 'quiz' },
    { to: '/publications', label: 'Publications', page: 'publications', icon: 'article' },
    { to: '/gallery', label: 'Gallery', page: 'gallery', icon: 'photo_library' },
    { to: '/contact-us', label: 'Contact Us', page: 'contact-us', icon: 'contact_mail' },
  ];

  return (
    // Wrap with a React Fragment
    <>
      <header className="bg-white/80 dark:bg-primary/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <nav className="container mx-auto p-3 h-20 flex items-center">
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="flex items-center space-x-3">
              <motion.img
                alt="DC-IAPM Logo"
                className="h-12 w-12" // Reduced logo size
                src={Logo}
              />
              <div className="font-display font-bold text-xs sm:text-sm text-primary dark:text-white md:block w-48 leading-tight">
                Delhi Chapter of Indian Association of Pathologists and Microbiologists (DC-IAPM)
              </div>
            </Link>

            <div className="hidden lg:flex items-center space-x-6">
              {navLinks.map((link) =>
                link.dropdown ? (
                  <div key={link.label} className="relative group">
                    <motion.button
                      variants={navLinkVariants}
                      whileHover="hover"
                      // This logic correctly highlights the parent tab if a child page is active
                      className={`nav-link font-semibold text-lg flex items-center transition-colors ${
                        currentPage === link.page || link.dropdown.some(item => item.to.slice(1) === currentPage) 
                          ? 'text-gold-DEFAULT dark:text-gold-light' 
                          : 'text-gray-800 dark:text-white'
                      }`}
                    >
                      {link.label} <span className="material-icons text-sm ml-1">expand_more</span>
                    </motion.button>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute hidden group-hover:block bg-white dark:bg-primary border border-gray-200 dark:border-gray-700 rounded shadow-lg mt-2 py-1 w-56"
                    >
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          // 3. This logic highlights the active dropdown item
                          className={`block px-4 py-2 text-base ${
                            currentPage === item.to.slice(1)
                              ? 'text-gold-DEFAULT dark:text-gold-light font-bold'
                              : 'text-gray-800 dark:text-white'
                          } hover:bg-gray-100 dark:hover:bg-blue-900 hover:text-gold-DEFAULT dark:hover:text-gold-light transition-colors`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  <motion.div key={link.to} variants={navLinkVariants} whileHover="hover">
                    <Link
                      to={link.to}
                      className={`nav-link font-semibold text-lg transition-colors ${currentPage === link.page ? 'text-gold-DEFAULT dark:text-gold-light' : 'text-gray-800 dark:text-white'
                        }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3 ml-4">
              {user ? (
                <>
                  <Link
                    to={isAdmin ? '/admin' : '/account'}
                    className="px-4 py-2 rounded-full bg-primary text-white text-sm font-bold hover:bg-blue-900 transition-colors"
                  >
                    {isAdmin ? 'Admin' : 'Account'}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-full border border-primary text-primary dark:border-white dark:text-white text-sm font-bold hover:bg-primary hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full bg-gold-DEFAULT text-primary text-sm font-bold hover:bg-yellow-400 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>

            <button className="lg:hidden text-primary dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <motion.div animate={{ rotate: isMenuOpen ? 90 : 0 }}>
                <span className="material-icons-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
              </motion.div>
            </button>
          </div>
        </nav>

      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="lg:hidden fixed top-0 left-0 w-full h-full bg-white dark:bg-primary z-50" // Added z-50 just in case
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 h-20">
              <Link to="/" className="flex items-center space-x-3" onClick={() => setIsMenuOpen(false)}>
                <img alt="DC-IAPM Logo" className="h-12 w-12" src={Logo} />
                <div className="font-display font-bold text-xs text-primary dark:text-white w-48 leading-tight">
                  Delhi Chapter of Indian Association of Pathologists and Microbiologists (DC-IAPM)
                </div>
              </Link>
              <button className="text-primary dark:text-white" onClick={() => setIsMenuOpen(false)}>
                <motion.div animate={{ rotate: 90 }}>
                  <span className="material-icons-outlined">close</span>
                </motion.div>
              </button>
            </div>
            <div className="px-4 py-2 space-y-1">
              {mobileNavLinks.map((link, i) => ( // 4. This uses the updated mobileNavLinks
                <motion.div
                  key={link.to}
                  custom={i}
                  variants={mobileNavLinkVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    to={link.to}
                    className={`flex items-center w-full text-left py-3 pl-4 font-semibold transition-colors text-xl ${currentPage === link.page
                        ? 'text-[#D4AF37] dark:text-gold-light' // ACTIVE
                        : 'text-gray-800 dark:text-white'
                      } hover:text-[#D4AF37] dark:hover:text-gold-light`} // HOVER
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="material-icons-outlined mr-4">{link.icon}</span>
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                {user ? (
                  <>
                    <Link
                      to={isAdmin ? '/admin' : '/account'}
                      className="flex items-center w-full text-left py-3 pl-4 font-semibold transition-colors text-xl text-gray-800 dark:text-white hover:text-[#D4AF37] dark:hover:text-gold-light"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="material-icons-outlined mr-4">{isAdmin ? 'admin_panel_settings' : 'account_circle'}</span>
                      {isAdmin ? 'Admin Dashboard' : 'My Account'}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center w-full text-left py-3 pl-4 font-semibold transition-colors text-xl text-red-600 hover:text-red-700"
                    >
                      <span className="material-icons-outlined mr-4">logout</span>
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center w-full text-left py-3 pl-4 font-semibold transition-colors text-xl text-gray-800 dark:text-white hover:text-[#D4AF37] dark:hover:text-gold-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="material-icons-outlined mr-4">login</span>
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
