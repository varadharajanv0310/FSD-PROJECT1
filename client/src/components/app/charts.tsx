import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { DashboardStats } from "@poise/shared";
import { formatDate } from "@/lib/format";

type TrendPoint = DashboardStats["trend"][number] & { label: string };

function TrendTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload as TrendPoint;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] shadow-[0_10px_30px_-12px_rgb(0_0_0/0.2)]">
      <p className="font-medium text-ink">{point.title}</p>
      <p className="mt-0.5 text-muted">
        {formatDate(point.date, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
        <span className="font-semibold tabular-nums text-ink">{point.score}</span>/100
      </p>
    </div>
  );
}

/**
 * Overall score per completed interview. One series, so no legend: a 2px
 * line over a 10% wash, with the latest value labelled at the end.
 */
export function ScoreTrendChart({ trend, height = 240 }: { trend: DashboardStats["trend"]; height?: number }) {
  const data: TrendPoint[] = trend.map((point) => ({ ...point, label: formatDate(point.date) }));
  const last = data.length - 1;

  return (
    <div style={{ height }} role="img" aria-label={`Overall score across ${data.length} interviews, latest ${data[last]?.score ?? 0} out of 100`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 28, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-faint)", fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={24}
            dy={8}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-faint)", fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-data)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="var(--color-data)"
            fillOpacity={0.1}
            isAnimationActive
            animationDuration={1100}
            activeDot={{ r: 5, fill: "var(--color-data)", stroke: "#fff", strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: TrendPoint }) => {
              const { cx = 0, cy = 0, index = 0, payload } = props;
              if (index !== last) return <g key={`dot-${index}`} />;
              return (
                <g key={`dot-${index}`}>
                  <circle cx={cx} cy={cy} r={5} fill="var(--color-data)" stroke="#fff" strokeWidth={2} />
                  <text x={cx} y={cy - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-ink)">
                    {payload?.score}
                  </text>
                </g>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
