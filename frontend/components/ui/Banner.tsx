import React from 'react';
import Link from 'next/link';

interface BannerProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export const Banner: React.FC<BannerProps> = ({ title, subtitle, ctaText, ctaLink }) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <p className="text-xl mb-8">{subtitle}</p>
        {ctaLink.startsWith('#') ? (
          <a
            href={ctaLink}
            className="bg-white text-blue-600 px-6 py-3 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            {ctaText}
          </a>
        ) : (
          <Link
            href={ctaLink}
            className="bg-white text-blue-600 px-6 py-3 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </div>
  );
}; 