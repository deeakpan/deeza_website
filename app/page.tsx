'use client';

import { Header } from '@/components/Header';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// Disable static generation - force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-blue-500">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.h1
            whileHover={{ scale: 1.05 }}
            className="text-white text-4xl md:text-6xl lg:text-8xl font-bold border-4 border-black px-6 md:px-8 py-3 md:py-4 bg-yellow-400 rounded-2xl md:rounded-3xl [text-shadow:_3px_3px_0_rgb(0_0_0)] inline-block shadow-[8px_8px_0_rgb(0,0,0)] flex items-center gap-2 md:gap-4"
          >
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-black" />
            <span>COMING SOON</span>
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-black" />
          </motion.h1>
        </motion.div>
      </div>
    </div>
  );
}
