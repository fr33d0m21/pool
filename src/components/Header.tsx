import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { InteractiveElement } from './InteractiveElement';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
      setShowBanner(!scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Testimonials', path: '/testimonials' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <>
      <motion.header
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold">
                <span className="text-[#00B4D8]">Pool</span>
                <span className={isScrolled ? 'text-gray-800' : isHomePage ? 'text-white' : 'text-gray-800'}>Spartans</span>
                <span className={`ml-2 text-sm italic ${isScrolled ? 'text-gray-600' : isHomePage ? 'text-white/80' : 'text-gray-600'} hidden md:inline-block`}>
                  Where expertise meets integrity
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`font-medium hover:text-[#00B4D8] transition-colors ${
                    isScrolled ? 'text-gray-600' : 'text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:block">
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`font-medium hover:text-[#00B4D8] transition-colors ${
                    isScrolled ? 'text-gray-600' : 'text-white'
                  }`}
                >
                  Sign In
                </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="bg-[#00B4D8] text-white px-6 py-2 rounded-full font-medium hover:bg-[#0096b4] transition-colors"
                onClick={() => navigate('/schedule')}
              >
                Schedule Service
              </motion.button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className={isScrolled ? 'text-gray-800' : isHomePage ? 'text-white' : 'text-gray-800'} size={24} />
              ) : (
                <Menu className={isScrolled ? 'text-gray-800' : isHomePage ? 'text-white' : 'text-gray-800'} size={24} />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4"
              >
                <div className="flex flex-col space-y-4 pb-4">
                  {menuItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`font-medium hover:text-[#00B4D8] transition-colors ${
                        isScrolled ? 'text-gray-600' : 'text-white'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    to="/login"
                    className={`font-medium hover:text-[#00B4D8] transition-colors ${
                      isScrolled ? 'text-gray-600' : 'text-white'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#00B4D8] text-white px-6 py-2 rounded-full font-medium hover:bg-[#0096b4] transition-colors w-full"
                    onClick={() => {
                      navigate('/schedule');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Schedule Service
                  </motion.button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </motion.header>
      
      {isHomePage && <div className="w-full flex justify-center">
        <AnimatePresence>
          {showBanner && (
            <motion.div
              className="fixed top-20 z-40 bg-white/90 backdrop-blur-sm py-2 px-6 rounded-full shadow-md mx-4 text-center"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-gray-700 flex items-center justify-center text-sm md:text-base">
                <span className="text-[#00B4D8] mr-2">★</span>
                Trusted by Palm Coast homeowners since 2002
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}
    </>
  );
}