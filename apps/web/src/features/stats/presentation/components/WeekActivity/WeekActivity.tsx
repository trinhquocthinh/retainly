import { describeWeekActivity, type Stats } from '../../../domain/stats';

import './WeekActivity.css';

/** Số lượt ôn từng ngày T2–CN của tuần hiện tại, không phụ thuộc khoảng đang chọn. */
export function WeekActivity({ week, now }: { week: Stats['week']; now: Date }) {
  const activity = describeWeekActivity(week, now);

  return (
    <section className="week-activity surface-panel" aria-labelledby="week-activity-title">
      <div className="week-activity__head">
        <h2 className="text-small" id="week-activity-title">
          Lượt ôn tuần này
        </h2>
        <span className="week-activity__total text-caption">{activity.total} lượt</span>
      </div>

      <ol className="week-activity__bars">
        {activity.days.map((day) => (
          <li
            key={day.date}
            className="week-activity__day"
            data-today={day.isToday || undefined}
            data-future={day.isFuture || undefined}
            data-peak={day.isPeak || undefined}
            aria-label={
              day.isFuture ? `${day.name}: chưa tới` : `${day.name}: ${day.reviews} lượt ôn`
            }
          >
            <span className="week-activity__track" aria-hidden="true">
              <span className="week-activity__fill" style={{ height: `${day.height}%` }} />
            </span>
            <span className="week-activity__label text-caption" aria-hidden="true">
              {day.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="week-activity__summary text-caption">
        {activity.peak
          ? `${activity.peak.name} nhiều lượt ôn nhất tuần (${activity.peak.reviews} lượt).`
          : 'Tuần này chưa có lượt ôn nào.'}
      </p>
    </section>
  );
}
