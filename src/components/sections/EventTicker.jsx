import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { listTickerUpdates } from '../../lib/ticker';
import { logDevError } from '../../lib/logger';

const fallbackUpdates = [
    { id: 'fallback-welcome', title: 'Welcome to DC-IAPM — Delhi Chapter of the Indian Association of Pathologists and Microbiologists.' },
];

const EventTicker = () => {
    const [updates, setUpdates] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listTickerUpdates()
            .then((rows) => {
                if (!cancelled) {
                    setUpdates(rows);
                    setLoaded(true);
                }
            })
            .catch((error) => {
                logDevError('Error loading ticker updates:', error);
                if (!cancelled) setLoaded(true);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured) return undefined;

        const channel = supabase
            .channel('public-ticker-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticker_updates' }, () => {
                listTickerUpdates()
                    .then((rows) => setUpdates(rows))
                    .catch(() => {});
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const displayUpdates = loaded && updates.length > 0 ? updates : fallbackUpdates;
    const duplicatedUpdates = [...displayUpdates, ...displayUpdates, ...displayUpdates];

    return (
        <div className="bg-primary border-b-8 border-gold-DEFAULT text-primary overflow-hidden py-4 relative z-30 shadow-xl">
            <div className="container mx-auto px-4 flex items-center relative">

                <div className="hidden md:flex items-center gap-2 bg-[#D4AF37] shadow-md z-10 flex-shrink-0 font-semibold px-4 py-2 rounded">
                    <span className="material-symbols-outlined text-2xl mx-1">campaign</span>
                    <span className="text-base mr-1 uppercase tracking-wider">Latest Updates</span>
                </div>

                <div className="flex-grow overflow-hidden relative mask-linear-fade">
                    <motion.div
                        className="flex items-center gap-16 whitespace-nowrap"
                        animate={{ x: ["0%", "-33.33%"] }}
                        transition={{
                            duration: Math.max(duplicatedUpdates.length * 16, 58),
                            ease: "linear",
                            repeat: Infinity,
                        }}
                        whileHover={{ animationPlayState: 'paused' }}
                        style={{ width: "fit-content" }}
                    >
                        {duplicatedUpdates.map((item, index) => {
                            const raw = item.link_url?.trim() || '/academics-events';
                            const isInternal = raw.startsWith('/');
                            const hasProtocol = /^https?:\/\//i.test(raw);
                            const target = isInternal ? raw : (hasProtocol ? raw : `https://${raw}`);
                            const linkClass = "flex items-center gap-3 group hover:opacity-100 opacity-90 transition-opacity";
                            const titleSpan = (
                                <span className="font-bold text-lg md:text-xl group-hover:text-gold-light transition-colors text-gray-200">
                                    {item.title}
                                </span>
                            );
                            return isInternal ? (
                                <Link
                                    key={`${item.id}-${index}`}
                                    to={target}
                                    className={linkClass}
                                >
                                    {titleSpan}
                                </Link>
                            ) : (
                                <a
                                    key={`${item.id}-${index}`}
                                    href={target}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={linkClass}
                                >
                                    {titleSpan}
                                </a>
                            );
                        })}
                    </motion.div>
                </div>

                <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-primary to-transparent z-10 pointer-events-none"></div>
            </div>
        </div>
    );
};

export default EventTicker;
