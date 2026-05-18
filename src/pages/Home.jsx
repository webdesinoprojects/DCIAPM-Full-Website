import React, { useState, useEffect } from 'react'
import SEO from '../components/SEO'
import HeroSection from '../components/sections/HeroSection'
import MissionSection from '../components/sections/MissionSection'
import PresidentSection from '../components/sections/PresidentSection'
import SecretarySection from '../components/sections/SecretarySection'
import QuickLinksSection from '../components/sections/QuickLinksSection'
import EventTicker from '../components/sections/EventTicker'
import CountdownTimer from '../components/common/CountdownTimer'

const Home = () => {
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchNextEvent = async () => {
      try {
        let events = [];

        // Try getting from cache first (populated by Academics page or previous visits)
        const cachedData = sessionStorage.getItem("events_data");

        if (cachedData) {
          events = JSON.parse(cachedData);
        } else {
          // Fetch if no cache
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_events" })
          });
          const data = await response.json();
          if (data.result === 'success') {
            events = data.data;
            sessionStorage.setItem("events_data", JSON.stringify(data.data));
          }
        }

        const now = new Date();

        // FILTER: Look for valid dates in the future
        const futureEvents = events
          .map(e => {
            // Prefer the robust 'timerdate', fall back to 'date'
            const rawDate = e.timerdate || e.date;
            const parsedDate = new Date(rawDate);
            return { ...e, parsedDate: parsedDate };
          })
          .filter(e => !isNaN(e.parsedDate.getTime()) && e.parsedDate > now)
          .sort((a, b) => a.parsedDate - b.parsedDate);

        if (futureEvents.length > 0) {
          setUpcomingEvent(futureEvents[0]);
        }

      } catch (error) {
        console.error("Error fetching events for home:", error);
      }
    };

    fetchNextEvent();
  }, []);

  return (
    <main>
      <SEO 
        title="Home" 
        description="Welcome to the Delhi Chapter of Indian Association of Pathologists and Microbiologists (DC-IAPM). Advancing pathology through education and research."
        keywords="DC-IAPM, pathology society India, IAPM Delhi chapter, medical education"
      />
      <HeroSection />
      <EventTicker />
      {/* DYNAMIC COUNTDOWN SECTION */}
      {upcomingEvent && (
        <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 flex flex-col items-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 w-full max-w-4xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col items-center">
                <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/60 text-primary dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
                  Upcoming Event
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3 text-center leading-tight">
                  {upcomingEvent.title}
                </h2>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-8 text-center text-sm md:text-base bg-gray-50 dark:bg-gray-700/50 py-2 px-4 rounded-lg flex-col md:flex-row">
                  <span className="flex gap-1">
                    <span className="material-symbols-outlined text-[#D4AF37]">calendar_month</span>
                    <span>{upcomingEvent.date}</span>
                  </span>
                  <span className="hidden md:inline mx-2 text-gray-300 dark:text-gray-600">|</span>
                  <span className="flex gap-1">
                    <span className="material-symbols-outlined text-[#D4AF37]">location_on</span>
                    <span>{upcomingEvent.location}</span>
                  </span>
                </div>

                <div className="transform scale-90 sm:scale-100 mb-6">
                  <CountdownTimer targetDate={upcomingEvent.timerdate || upcomingEvent.date} variant="home" />
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center w-full">
                  <a
                    href="/academics-events"
                    className="group inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    View Event Details
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </a>
                  
                  <a
                    href="/guidelines.jpg"
                    download="Abstract_Submission_Guidelines.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-center gap-2 bg-white border-2 border-primary text-primary hover:bg-gray-50 px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    View Abstract Submission Guidelines
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">description</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      <MissionSection />
      <PresidentSection />
      <SecretarySection />
      <QuickLinksSection />
    </main>
  )
}

export default Home
