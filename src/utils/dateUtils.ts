export const formatDate = (date: string | number | Date) => {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let dateLabel;
  if (isToday) {
    dateLabel = 'Today';
  } else if (isYesterday) {
    dateLabel = 'Yesterday';
  } else {
    dateLabel = d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return `${time}, ${dateLabel}`;
};
