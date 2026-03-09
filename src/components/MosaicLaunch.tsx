import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket } from 'lucide-react';

interface MosaicLaunchProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const MosaicLaunch: React.FC<MosaicLaunchProps> = ({ isVisible, onComplete }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-end justify-center overflow-hidden">
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: -window.innerHeight - 200, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.5, 1.5, 1],
              rotate: [0, -5, 5, -5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              ease: "easeIn",
              times: [0, 0.1, 0.8, 1]
            }}
            className="relative"
          >
            {/* Rocket Icon */}
            <div className="relative z-10 text-primary-accent">
              <Rocket size={80} className="drop-shadow-[0_0_30px_rgba(84,110,134,0.5)]" />
            </div>

            {/* Flame/Trail Effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0.5, 0], scale: [0, 1.2, 1, 0.8] }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-32 bg-gradient-to-t from-transparent via-orange-500 to-primary-accent blur-xl rounded-full"
            />
            
            {/* Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  scale: [0, 1, 0],
                  x: (i - 2.5) * 20,
                  y: 40 + Math.random() * 40
                }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05, repeat: Infinity }}
                className="absolute top-full left-1/2 w-2 h-2 bg-primary-accent rounded-full blur-sm"
              />
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
