import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EventTicker = () => {
    const [events, setEvents] = useState([]);

    // YOUR SCRIPT URL
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "get_events" })
                });
                const data = await response.json();
                if (data.result === 'success' && Array.isArray(data.data)) {
                    setEvents(data.data);
                }
            } catch (error) {
                console.error("Error fetching ticker events:", error);
            }
        };

        fetchEvents();
    }, []);

    const promoEvent = {
        title: "We are also conducting a promotional membership drive where a pathologist can become member paying only 1500/- until Dec 31st 2026. This additional tab can be added and we will later delete",
    };

    // Use default static events if API returns empty or while loading to avoid empty bar
    const displayEvents = events.length > 0
        ? [promoEvent, ...events]
        : [
            promoEvent,
            {
                title: "Welcome to DC-IAPM",
                date: new Date().getFullYear(),
                location: "New Delhi"
            }
        ];

    // Duplicate the array to create a seamless loop
    const duplicatedEvents = [...displayEvents, ...displayEvents, ...displayEvents];

    return (
        <div className="bg-primary border-b-8 border-gold-DEFAULT text-primary overflow-hidden py-4 relative z-30 shadow-xl">
            <div className="container mx-auto px-4 flex items-center relative">

                <div className="hidden md:flex items-center gap-2 bg-[#D4AF37] shadow-md z-10 flex-shrink-0 font-semibold px-4 py-2 rounded">

                    <span className="material-symbols-outlined text-2xl mx-1">campaign</span>

                    <span className="text-base mr-1 uppercase tracking-wider">Latest Updates</span>
                </div>

                {/* Ticker Container */}
                <div className="flex-grow overflow-hidden relative mask-linear-fade">
                    <motion.div

                        className="flex items-center gap-16 whitespace-nowrap"
                        // Animate x from 0 to -33.33% because we tripled the content. 
                        animate={{ x: ["0%", "-33.33%"] }}
                        transition={{
                            duration: Math.max(duplicatedEvents.length * 6, 20), // Slower, smoother speed for larger text
                            ease: "linear",
                            repeat: Infinity,
                        }}
                        whileHover={{ animationPlayState: 'paused' }}
                        style={{ width: "fit-content" }}
                    >
                        {duplicatedEvents.map((event, index) => (
                            <Link
                                key={`${event.title}-${index}`}
                                to="/academics-events"
                                className="flex items-center gap-3 group hover:opacity-100 opacity-90 transition-opacity"
                            >
                                <span className="w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse"></span>

                                <span className="font-bold text-lg md:text-xl group-hover:text-gold-light transition-colors text-gray-200">
                                    {event.title}
                                </span>

                                {event.date && (
                                    <span className="text-sm bg-white/10 px-3 py-1 rounded text-gray-200 group-hover:bg-white/20 border border-white/10">
                                        {event.date}
                                    </span>
                                )}

                                {event.location && (
                                    <span className="text-sm md:text-base text-gray-300 flex items-center">
                                        <span className="material-symbols-outlined text-[18px] mr-1 text-[#D4AF37]">location_on</span>
                                        {event.location}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </motion.div>
                </div>

                {/* Right side fade effect */}
                <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-primary to-transparent z-10 pointer-events-none"></div>
            </div>
        </div>
    );
};

export default EventTicker;
