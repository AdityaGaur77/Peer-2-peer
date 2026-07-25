import type { Session, Tutor } from './types';
import { downloadText } from './util';

function icsStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** One-click add for anyone living in Google Calendar. */
export function googleCalUrl(session: Session, tutor: Tutor | undefined): string {
  const start = new Date(session.startISO).getTime();
  const end = start + session.durationMin * 60_000;
  const stamp = (ms: number) => icsStamp(ms);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Relay · ${session.title}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `${session.description}\n\nTutor: ${tutor?.name ?? 'Relay tutor'}\nJoin: ${session.link}\n\nFree peer tutoring — the only fee is passing it on.`,
    location: session.link,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadSessionICS(session: Session, tutor: Tutor | undefined): void {
  const start = new Date(session.startISO).getTime();
  const end = start + session.durationMin * 60_000;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Relay//Free Peer Tutoring//EN',
    'BEGIN:VEVENT',
    `UID:${session.id}@relay`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(`Relay · ${session.title}`)}`,
    `DESCRIPTION:${icsEscape(
      `${session.description}\n\nTutor: ${tutor?.name ?? 'Relay tutor'}\nJoin: ${session.link}\n\nFree peer tutoring — the only fee is passing it on.`,
    )}`,
    `LOCATION:${icsEscape(session.link)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  downloadText(
    `relay-${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`,
    lines.join('\r\n'),
    'text/calendar',
  );
}
