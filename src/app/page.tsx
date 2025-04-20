"use client";

import { useRef } from 'react';
import RecipeFinder from '@/components/RecipeFinder'; // adjust the import path as needed

const HomePage = () => {
  const finderRef = useRef<any>(null);

  const handleLoginSuccess = () => {
    finderRef.current?.refreshData();
  };

  return (
    <RecipeFinder ref={finderRef} onLoginSuccess={handleLoginSuccess} />
  );
};

export default HomePage;
