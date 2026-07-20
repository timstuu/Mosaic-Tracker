import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export const DynamicBackground: React.FC = () => {
  // Grab the scroll container's scroll progress in the vertical axis
  const { scrollYProgress } = useScroll();

  // Create subtle, silky transformations that shift the linear gradient
  // and expand scale slightly on scroll.
  // Translating -10% or so dynamically offsets the gradient color stop distribution,
  // making the off-white section appear seamlessly at the bottom during footer scroll.
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.15]);
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);

  return (
    <>
      {/* 
        The Fixed Infinite Canvas.
        A perfectly styled, dynamic canvas transitioning through the MOSAIC color palette:
        Deep Slate (#242d3a), Muted Blue (#576d87), and Off-White (#e7e7e7).
      */}
      <motion.div 
        className="fixed inset-0 -z-50 w-screen h-[115vh] origin-top will-change-transform"
        style={{
          scale: bgScale,
          y: bgY,
          background: 'linear-gradient(180deg, #242d3a 0%, #29384c 30%, #576d87 68%, #b2becd 88%, #e7e7e7 100%)',
        }}
      />

      {/* 
        The Fine-Film Grain Overlay Layer.
        -z-40 overlay covers the background element, pointer-events-none lets mouse flows work, 
        mix-blend-overlay creates premium grain integration. Uses a static base64 PNG pattern
        to avoid heavy SVG turbulence repaint lag.
      */}
      <div 
        className="fixed inset-0 -z-40 pointer-events-none opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADt2YrJAAAAElBMVEUAAAD///////////8AAAD///+///+VAAAAAXRSTlMAQObYZgAAADRJREFUeF7tyrENACAMA8EM8v9Po2AD2UtVvBssA1D1a7g6fWqmq9OnZro6fWqmq9OnZro6fWp+YQWwA6Q2tAAAAABJRU5ErkJggg==")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </>
  );
};

export const LayoutWithBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <DynamicBackground />
      {children}
    </>
  );
};
