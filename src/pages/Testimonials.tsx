import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, User, ThumbsUp } from 'lucide-react';
import { Header } from '../components/Header';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';
import { AnimatedSection } from '../components/AnimatedSection';

export function Testimonials() {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    review: ''
  });

  const testimonials = [
    {
      name: "Sarah Johnson",
      date: "March 2024",
      rating: 5,
      review: "Edward has been maintaining our pool for over 3 years now. His service is exceptional, always on time, and our pool has never looked better! The attention to detail and knowledge of water chemistry is impressive.",
      verified: true
    },
    {
      name: "Michael Rodriguez",
      date: "February 2024",
      rating: 5,
      review: "The most reliable pool service I've ever used. Professional, knowledgeable, and always goes above and beyond. Edward takes the time to explain everything and provides great maintenance tips.",
      verified: true
    },
    {
      name: "Jennifer Smith",
      date: "January 2024",
      rating: 5,
      review: "After trying several pool services, we finally found Pool Spartans. The difference in quality and service is night and day. Our pool is crystal clear and perfectly balanced all year round.",
      verified: true
    },
    {
      name: "David Thompson",
      date: "December 2023",
      rating: 5,
      review: "Outstanding service! Edward's knowledge of pool chemistry and maintenance is impressive. He's always available to answer questions and provides detailed explanations of the work performed.",
      verified: true
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open('https://g.page/r/CR7TTiAJ9mENEAE/review', '_blank');
    setShowReviewForm(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <motion.div 
        className="relative h-[60vh] w-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg')",
            filter: "brightness(0.7)"
          }}
        />
        <motion.div 
          className="absolute inset-0 flex flex-col justify-center items-center text-white px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <InteractiveElement depth={30} rotationIntensity={5} className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-center">
              Client Reviews
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              See what our satisfied clients have to say
            </p>
          </InteractiveElement>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <InteractiveElement depth={20} className="mb-8">
              <div className="flex justify-center items-center space-x-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-8 h-8 text-yellow-400 fill-current" />
                ))}
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">5.0 Rating on Google</h2>
              <p className="text-lg text-gray-600">Based on 50+ reviews</p>
            </InteractiveElement>
            
            <InteractiveElement 
              depth={25} 
              rotationIntensity={8} 
              scaleOnHover={1.08}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReviewForm(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Write a Review
              </motion.button>
            </InteractiveElement>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <InteractiveCard
                key={index}
                depth={40}
                rotationIntensity={20}
                scaleOnHover={1.08}
                className="bg-white rounded-xl p-8 shadow-lg"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <InteractiveElement depth={30} rotationIntensity={15} className="mb-4">
                    <div className="flex items-center mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </InteractiveElement>

                  <InteractiveElement depth={25} className="mb-6">
                    <p className="text-gray-700 italic">"{testimonial.review}"</p>
                  </InteractiveElement>

                  <InteractiveElement depth={20}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{testimonial.name}</span>
                        {testimonial.verified && (
                          <span className="text-green-600 text-sm flex items-center">
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">{testimonial.date}</span>
                    </div>
                  </InteractiveElement>
                </motion.div>
              </InteractiveCard>
            ))}
          </div>

          {/* Review Form Modal */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
                onClick={() => setShowReviewForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-8 max-w-lg w-full"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Write a Review</h3>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Rating</label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setReviewForm(prev => ({ ...prev, rating }))}
                            className="focus:outline-none"
                          >
                            <Star 
                              className={`w-8 h-8 ${rating <= reviewForm.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <InteractiveElement depth={15} rotationIntensity={6}>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Google Reviews
                      </button>
                    </InteractiveElement>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedSection>
    </div>
  );
}