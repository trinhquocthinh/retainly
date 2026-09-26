import { APP_LOCALE, APP_TIME_ZONE } from '@src/shared/constants/locale';
import { IconCheck } from '@src/shared/ui/Icons/Icons';

import {
  describeWeek,
  greetingFor,
  type HomeOverview,
  type WeekDayState,
} from '../../../domain/home';

import './HomeHeader.css';

const DATE_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: APP_TIME_ZONE,
});

const DAY_STATUS: Record<WeekDayState, string> = {
  reviewed: 'đã ôn',
  missed: 'không ôn',
  today: 'hôm nay, chưa ôn',
  future: 'chưa tới',
};

type HomeHeaderProps = {
  name: string | undefined;
  streak: HomeOverview['streak'];
  now: Date;
};

/** Lời chào và dải chuỗi ngày T2–CN của tuần hiện tại. */
export function HomeHeader({ name, streak, now }: HomeHeaderProps) {
  const days = describeWeek(streak.week, now);

  return (
    <header className="home-header">
      <div className="home-header__intro">
        <p className="home-header__date text-small">Hôm nay · {DATE_FORMATTER.format(now)}</p>
        <h1 className="text-h1">
          {greetingFor(now)}
          {name ? `, ${name}` : ''}!
        </h1>
      </div>

      <section className="home-week surface-panel" aria-label="Chuỗi ngày ôn tuần này">
        <p className="home-week__streak">
          <span aria-hidden="true">🔥</span>
          {streak.current > 0 ? `${streak.current} ngày liền` : 'Chưa có chuỗi ngày'}
        </p>
        <ol className="home-week__days">
          {days.map((day) => (
            <li
              key={day.date}
              className="home-week__day"
              data-state={day.state}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${day.label}: ${DAY_STATUS[day.state]}`}
            >
              <span className="home-week__label" aria-hidden="true">
                {day.label}
              </span>
              <span className="home-week__mark" aria-hidden="true">
                {day.state === 'reviewed' ? <IconCheck size={14} /> : '–'}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </header>
  );
}
