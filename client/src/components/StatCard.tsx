import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  subtitle?: string;
  color: "primary" | "secondary" | "accent" | "neutral-dark";
  isLoading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  subtitle,
  color,
  isLoading = false,
}: StatCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "primary":
        return {
          bg: "bg-primary",
          light: "bg-primary-light",
        };
      case "secondary":
        return {
          bg: "bg-secondary",
          light: "bg-secondary-light",
        };
      case "accent":
        return {
          bg: "bg-accent",
          light: "bg-accent-light",
        };
      case "neutral-dark":
        return {
          bg: "bg-neutral-dark",
          light: "bg-neutral",
        };
      default:
        return {
          bg: "bg-primary",
          light: "bg-primary-light",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`${colors.bg} text-white rounded-lg p-4`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-75">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-white/20 animate-pulse rounded my-1"></div>
          ) : (
            <h3 className="text-2xl font-bold">{value}</h3>
          )}
        </div>
        <div className={`p-2 ${colors.light} rounded-md`}>
          {icon}
        </div>
      </div>
      {change ? (
        <p className="text-xs mt-2 flex items-center">
          <span className={`${change.trend === "up" ? "text-accent" : "text-red-400"} mr-1`}>
            {change.trend === "up" ? "↑" : "↓"} {change.value}
          </span> 
          vs last period
        </p>
      ) : subtitle ? (
        <p className="text-xs mt-2">{subtitle}</p>
      ) : null}
    </div>
  );
}
