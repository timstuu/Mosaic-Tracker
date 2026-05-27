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
        High-performance SVG filter to generate fine-grained film texture.
        sr-only and aria-hidden ensure screen readers and rendering ignores this container.
      */}
      <svg className="sr-only" aria-hidden="true">
        <filter id="grainy-noise">
          {/* 
            feTurbulence generates a smooth, highly detailed fractal structure.
            A fine grain frequency (0.65-0.80) with 3 octaves works best.
          */}
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.75" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
          {/* Subtle alpha/color correction to dial down contrast of the grain */}
          <feColorMatrix 
            type="matrix" 
            values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.12 0" 
          />
        </filter>
      </svg>

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
        mix-blend-overlay creates premium grain integration.
      */}
      <div 
        className="fixed inset-0 -z-40 pointer-events-none opacity-[0.16] will-change-transform mix-blend-overlay"
        style={{
          filter: 'url(#grainy-noise)',
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
