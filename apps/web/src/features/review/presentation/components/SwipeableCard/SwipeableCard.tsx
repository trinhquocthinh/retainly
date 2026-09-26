import { useState } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

import { outcomeForSwipe, type DueCard, type ReviewOutcome } from '../../../domain/review';
import { ReviewCard } from '../ReviewCard/ReviewCard';

import './SwipeableCard.css';

type SwipeableCardProps = {
  card: DueCard;
  flipped: boolean;
  enabled: boolean;
  onFlip: () => void;
  onRate: (outcome: ReviewOutcome) => void;
};

const FLY_OUT_DISTANCE = 600;

export function SwipeableCard({ card, flipped, enabled, onFlip, onRate }: SwipeableCardProps) {
  const [{ x, rotate }, api] = useSpring(() => ({ x: 0, rotate: 0 }));
  const [hint, setHint] = useState<ReviewOutcome | null>(null);

  const bind = useDrag(
    ({ down, movement: [mx], last }) => {
      const outcome = outcomeForSwipe(mx);

      if (last) {
        setHint(null);

        if (outcome) {
          const direction = Math.sign(mx);
          // Thẻ bay ra rồi mới đặt lại vị trí, để thẻ kế tiếp xuất hiện ở giữa
          // chứ không trượt vào từ ngoài màn hình.
          api.start({
            x: direction * FLY_OUT_DISTANCE,
            rotate: direction * 20,
            onRest: () => api.set({ x: 0, rotate: 0 }),
          });
          onRate(outcome);
          return;
        }

        api.start({ x: 0, rotate: 0 });
        return;
      }

      setHint(outcome ?? null);
      api.start({ x: down ? mx : 0, rotate: down ? mx / 20 : 0, immediate: down });
    },
    // filterTaps: chạm để lật thẻ vẫn hoạt động, không bị nuốt thành cử chỉ kéo.
    { enabled, axis: 'x', filterTaps: true },
  );

  return (
    <div className={`swipeable ${hint ? `swipeable--${hint}` : ''}`}>
      <animated.div className="swipeable__layer" {...bind()} style={{ x, rotate }}>
        {hint ? (
          <span className={`swipeable__stamp swipeable__stamp--${hint}`} aria-hidden="true">
            {hint === 'remembered' ? 'Nhớ' : 'Quên'}
          </span>
        ) : null}
        <ReviewCard card={card} memory={card.memory} flipped={flipped} onFlip={onFlip} />
      </animated.div>
    </div>
  );
}
