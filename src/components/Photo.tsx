import { photoFor } from '@/lib/photos';

/**
 * A committed photograph.
 *
 * The 24-pixel preview is the wrapper's BACKGROUND rather than a second image
 * that fades out: it costs no JavaScript, the real photo simply covers it when
 * it decodes, and the box is already the right size so nothing moves.
 */
export function Photo({
    slot,
    alt,
    sizes = '(max-width: 640px) 100vw, 640px',
    className = '',
    priority = false,
}: {
    slot: string;
    alt: string;
    sizes?: string;
    className?: string;
    priority?: boolean;
}) {
    const photo = photoFor(slot);
    if (!photo) return null;

    return (
        <div
            className={`overflow-hidden bg-sand-100 ${className}`}
            style={{
                aspectRatio: photo.ratio,
                backgroundImage: photo.lqip ? `url("${photo.lqip}")` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <img
                src={photo.src}
                srcSet={photo.srcSet}
                sizes={sizes}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover"
            />
        </div>
    );
}
