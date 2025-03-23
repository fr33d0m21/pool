import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function ContactForm() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formState);
  };

  const inputClasses = "w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-base md:text-lg";

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 md:space-y-6 w-full max-w-lg mx-auto"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        placeholder="Name"
        value={formState.name}
        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
        className={inputClasses}
        required
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formState.email}
        onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
        className={inputClasses}
        required
      />
      
      <textarea
        placeholder="Message"
        rows={4}
        value={formState.message}
        onChange={(e) => setFormState(prev => ({ ...prev, message: e.target.value }))}
        className={inputClasses}
        required
      />

      <motion.button
        whileTap={{ scale: 0.95 }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 text-base md:text-lg"
        type="submit"
      >
        Send Message
      </motion.button>
    </motion.form>
  );
}