import { useState, useEffect } from 'react';

export interface LiveClass {
  id: string;
  title: string;
  instructor: string;
  startTime: string; 
  isLiveNow: boolean;
}

export function useLiveClasses() {
  const [data, setData] = useState<LiveClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mocking an API call
    const timer = setTimeout(() => {
      setData([
        {
          id: '1',
          title: 'Live Strategy & PYQ Marathon',
          instructor: 'Dr. Sudhanshu Sharma',
          startTime: 'Today, 6:00 PM',
          isLiveNow: true,
        },
        {
          id: '2',
          title: 'Quantitative Aptitude Deep Dive',
          instructor: 'Prof. Ramesh',
          startTime: 'Today, 8:00 PM',
          isLiveNow: false,
        },
        {
          id: '3',
          title: 'Reasoning Tricks & Tips',
          instructor: 'Anjali Desai',
          startTime: 'Today, 9:30 PM',
          isLiveNow: false,
        }
      ]);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading };
}
