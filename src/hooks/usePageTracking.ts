import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../api/analytics';

export function usePageTracking(): void {
    const location = useLocation();
    const lastPathRef = useRef<string>('');

    useEffect(() => {
        const path = location.pathname + location.search;
        if (path === lastPathRef.current) return;
        lastPathRef.current = path;
        // Defer to next tick so document.title is updated by the newly mounted page.
        const id = window.setTimeout(() => {
            trackPageView({ page_path: path, page_title: document.title });
        }, 0);
        return () => window.clearTimeout(id);
    }, [location.pathname, location.search]);
}
