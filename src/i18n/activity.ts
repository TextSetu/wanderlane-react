/**
 * A log of what the translation layer actually did.
 *
 * The runtime layer is invisible when it works — a screen that renders is a
 * screen that renders, whether its copy came off the CDN a second ago or out of
 * the bundle at build time. That is a problem twice: nobody can tell a working
 * integration from a silently broken one, and during a demo neither can the
 * audience. This makes it legible.
 *
 * ⚠️ It is an observer and never a participant. Nothing in `otaBackend.ts`
 * branches on what is recorded here, so a bug in this file cannot change which
 * copy a reader sees. Bounded to `LIMIT` entries because a long session
 * switching languages would otherwise grow it without end.
 */

export type NamespaceSource = 'cdn' | 'bundled' | 'missing' | 'error';

export interface NamespaceEvent {
    /** Monotonic, so React has a stable key without a timestamp collision. */
    id: number;
    language: string;
    namespace: string;
    source: NamespaceSource;
    /** Bytes of JSON, when it came over the wire. */
    bytes: number | null;
    /** The release it was served from, when known. */
    release: number | null;
}

const LIMIT = 40;

let nextId = 1;
let events: NamespaceEvent[] = [];
const listeners = new Set<() => void>();

export function recordNamespaceLoad(event: Omit<NamespaceEvent, 'id'>): void {
    events = [{ id: nextId++, ...event }, ...events].slice(0, LIMIT);
    for (const listener of listeners) listener();
}

export function subscribeToNamespaceLoads(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * ⚠️ Returns the SAME array reference until something is recorded.
 * `useSyncExternalStore` compares snapshots with `Object.is` and re-renders on
 * every change it sees — returning a fresh array here (`[...events]`) makes
 * every render look like a change and loops forever.
 */
export function namespaceLoads(): NamespaceEvent[] {
    return events;
}
