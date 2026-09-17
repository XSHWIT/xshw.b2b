import { firebaseApp } from './firebaseClient';
import {
    getAnalytics,
    initializeAnalytics,
    isSupported,
    logEvent,
    type Analytics,
} from 'firebase/analytics';

type EventParams = Record<string, unknown>;

export interface AnalyticsItem {
    item_id: string;
    item_name: string;
    item_category?: string;
    item_variant?: string;
    quantity?: number;
}

let analytics: Analytics | null = null;
let initPromise: Promise<void> | null = null;

const isProd = import.meta.env.PROD;

async function ensureInit(): Promise<void> {
    if (analytics || !firebaseApp) return;
    if (!isProd) return;
    if (typeof window === 'undefined') return;
    if (!initPromise) {
        initPromise = (async () => {
            try {
                if (!(await isSupported())) return;
                // Disable auto page_view; usePageTracking handles all route changes.
                try {
                    analytics = initializeAnalytics(firebaseApp, {
                        config: { send_page_view: false },
                    });
                } catch {
                    analytics = getAnalytics(firebaseApp);
                }
            } catch (err) {
                console.warn('[analytics] init failed', err);
            }
        })();
    }
    return initPromise;
}

// Fire and forget; guarantees no error bubbles up to callers.
function track(eventName: string, params?: EventParams): void {
    if (!isProd) {
        if (import.meta.env.DEV) {
            console.debug(`[analytics:dev] ${eventName}`, params ?? {});
        }
        return;
    }
    void ensureInit().then(() => {
        if (!analytics) return;
        try {
            logEvent(analytics, eventName as string, params as Record<string, unknown>);
        } catch (err) {
            console.warn(`[analytics] logEvent failed for ${eventName}`, err);
        }
    });
}

export function trackPageView(params: { page_path: string; page_title?: string }): void {
    track('page_view', {
        page_path: params.page_path,
        page_title: params.page_title ?? (typeof document !== 'undefined' ? document.title : undefined),
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
}

export function trackViewItem(item: AnalyticsItem): void {
    track('view_item', { items: [item] });
}

export function trackViewItemList(params: {
    item_list_id?: string;
    item_list_name?: string;
    items: AnalyticsItem[];
}): void {
    track('view_item_list', {
        item_list_id: params.item_list_id,
        item_list_name: params.item_list_name,
        items: params.items.slice(0, 20),
    });
}

export function trackAddToCart(item: AnalyticsItem): void {
    track('add_to_cart', { items: [item] });
}

export function trackRemoveFromCart(item: AnalyticsItem): void {
    track('remove_from_cart', { items: [item] });
}

export function trackSelectContent(params: { content_type: string; content_id: string }): void {
    track('select_content', params);
}

export function trackChangeLanguage(language: string): void {
    track('change_language', { language });
}
