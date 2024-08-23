interface ScheduleItem {
  start: string;
  end: string;
}

export function formatScheduleDataToString(scheduleData: ScheduleItem[]) {
  const groupedByDay = scheduleData.reduce(
    (acc, item) => {
      const startDate = new Date(item.start);
      const endDate = new Date(item.end);
      const dayName = startDate.toLocaleString('pt-BR', { weekday: 'long' });
      const dayDate = startDate.toLocaleDateString('pt-BR');

      const dayKey = `${dayName} (${dayDate})`;

      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }

      acc[dayKey].push({
        start: startDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        end: endDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      return acc;
    },
    {} as Record<string, { start: string; end: string }[]>,
  );

  const formattedSchedule = Object.entries(groupedByDay)
    .map(([day, hours]) => {
      const formattedHours = hours
        .map((hour) => `${hour.start} - ${hour.end}`)
        .join('\n');
      return `${day}\n${formattedHours}`;
    })
    .join('\n\n');

  return `Horários indisponíveis:\n\n${formattedSchedule}`;
}
