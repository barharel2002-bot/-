'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { ShortCard } from '@/lib/swipes/shorts-feed';

// Shorts swipe deck — Tinder-style. Right = liked, left = skipped.
// Decision is POSTed to /api/swipes/decision which writes to swipe_items.
export function ShortsDeck({ cards }: { cards: ShortCard[] }) {
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const card = cards[index];

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <p>Done for today!</p>
        <p className="text-xs">Come back tomorrow for fresh shorts.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[480px] flex justify-center items-center">
      <motion.div
        key={card.videoId}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate }}
        onDragEnd={async (_, info) => {
          if (Math.abs(info.offset.x) > 100) {
            const liked = info.offset.x > 0;
            try {
              await fetch('/api/swipes/decision', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  video_id: card.videoId,
                  title: card.title,
                  thumbnail_url: card.thumbnailUrl,
                  decision: liked ? 'liked' : 'skipped',
                }),
              });
            } catch (err: any) {
              console.error('[ShortsDeck] decision failed:', err.message);
            }
            setIndex((i) => i + 1);
          }
        }}
        className="w-72 h-[400px] rounded-xl overflow-hidden bg-zinc-900 shadow-xl cursor-grab active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.thumbnailUrl}
          alt={card.title}
          className="w-full h-2/3 object-cover"
        />
        <div className="p-3">
          <p className="text-sm line-clamp-3">{card.title}</p>
        </div>
      </motion.div>
    </div>
  );
}
