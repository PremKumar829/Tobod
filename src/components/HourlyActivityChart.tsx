import React, { useState } from 'react';
import { TrendingUp, UserPlus, UserMinus, Calendar } from 'lucide-react';

interface HourlyData {
  hour: string;
  joins: number;
  exits: number;
}

interface HourlyActivityChartProps {
  data: HourlyData[];
}

export const HourlyActivityChart: React.FC<HourlyActivityChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.joins, d.exits)),
    5
  );

  const totalJoinsToday = data.reduce((acc, curr) => acc + curr.joins, 0);
  const totalExitsToday = data.reduce((acc, curr) => acc + curr.exits, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Today's Member Traffic Trend (24h Activity)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time hourly breakdown of joining applicants approved vs exited members
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span className="text-slate-300">Joins ({totalJoinsToday})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span className="text-slate-300">Exits ({totalExitsToday})</span>
          </div>
        </div>
      </div>

      {/* Bar graph container */}
      <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-800 relative">
        {/* Background grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-slate-700 w-full" />
          <div className="border-b border-slate-700 w-full" />
          <div className="border-b border-slate-700 w-full" />
        </div>

        {data.map((item, idx) => {
          const joinHeight = Math.round((item.joins / maxVal) * 120);
          const exitHeight = Math.round((item.exits / maxVal) * 120);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-14 z-20 bg-slate-950 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] whitespace-nowrap pointer-events-none flex flex-col gap-0.5">
                  <div className="font-semibold text-slate-300 border-b border-slate-800 pb-0.5">
                    {item.hour} UTC
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <span>+{item.joins} joined</span>
                  </div>
                  <div className="flex items-center space-x-2 text-rose-400">
                    <span>-{item.exits} exited</span>
                  </div>
                </div>
              )}

              {/* Bars container */}
              <div className="w-full max-w-[28px] flex items-end justify-center space-x-1">
                {/* Join bar */}
                <div
                  style={{ height: `${Math.max(joinHeight, item.joins > 0 ? 6 : 2)}px` }}
                  className={`w-1/2 rounded-t-sm transition-all duration-300 ${
                    item.joins > 0
                      ? 'bg-emerald-500 group-hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-800/40'
                  }`}
                />
                {/* Exit bar */}
                <div
                  style={{ height: `${Math.max(exitHeight, item.exits > 0 ? 6 : 2)}px` }}
                  className={`w-1/2 rounded-t-sm transition-all duration-300 ${
                    item.exits > 0
                      ? 'bg-rose-500 group-hover:bg-rose-400 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-800/40'
                  }`}
                />
              </div>

              {/* Hour Label */}
              <span className="text-[10px] text-slate-500 group-hover:text-slate-300 mt-2 font-mono">
                {item.hour.split(':')[0]}h
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
        <span className="flex items-center space-x-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Today (UTC Timezone)</span>
        </span>
        <span className="font-mono text-slate-400 text-[11px]">
          Net Growth Today:{' '}
          <strong className={totalJoinsToday >= totalExitsToday ? 'text-emerald-400' : 'text-rose-400'}>
            {totalJoinsToday >= totalExitsToday ? `+${totalJoinsToday - totalExitsToday}` : totalJoinsToday - totalExitsToday} members
          </strong>
        </span>
      </div>
    </div>
  );
};
