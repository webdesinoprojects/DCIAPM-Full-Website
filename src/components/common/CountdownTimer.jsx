import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate, title, variant = 'default' }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isValidDate, setIsValidDate] = useState(true);

  useEffect(() => {
    // 1. If no date is provided, hide timer
    if (!targetDate) {
      setIsValidDate(false);
      return;
    }

    // 2. Simple parsing because we trust the new 'TimerDate' column
    const target = new Date(targetDate);
    
    // 3. Safety check: Invalid Date?
    if (isNaN(target.getTime())) {
      console.warn("Invalid Timer Date:", targetDate);
      setIsValidDate(false);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = target - new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
        setIsValidDate(true);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!isValidDate) return null;

  // Enhanced UI (Home Page)
  if (variant === 'home') {
    const TimeBox = ({ value, label }) => (
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-blue-900 dark:from-blue-900 dark:to-blue-950 rounded-xl flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-sm transform hover:scale-105 transition-transform duration-300">
          <span className="text-2xl sm:text-3xl font-bold text-white font-mono drop-shadow-md">
            {String(value).padStart(2, '0')}
          </span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 mt-2 uppercase tracking-wider">
          {label}
        </span>
      </div>
    );

    return (
      <div className="flex flex-col items-center p-4">
        {title && <span className="text-sm font-bold text-primary dark:text-blue-400 mb-4 uppercase tracking-widest border-b-2 border-[#D4AF37] pb-1">{title}</span>}
        <div className="flex gap-3 sm:gap-4">
          <TimeBox value={timeLeft.days} label="Days" />
          <TimeBox value={timeLeft.hours} label="Hours" />
          <TimeBox value={timeLeft.minutes} label="Mins" />
          <TimeBox value={timeLeft.seconds} label="Secs" />
        </div>
      </div>
    );
  }

  // Default (Academics Page)
  const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary dark:bg-blue-900 rounded-lg flex items-center justify-center shadow border border-blue-200 dark:border-blue-700">
        <span className="text-lg sm:text-xl font-bold text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 uppercase">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      {title && <span className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">{title}</span>}
      <div className="flex gap-2 sm:gap-3">
        <TimeBox value={timeLeft.days} label="Days" />
        <TimeBox value={timeLeft.hours} label="Hrs" />
        <TimeBox value={timeLeft.minutes} label="Mins" />
        <TimeBox value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  );
};

export default CountdownTimer;