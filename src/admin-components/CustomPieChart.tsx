"use client";

import React from "react";
import { Box, Card, CardContent } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";

const CustomPieChart: React.FC = () => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // Sample data for pie chart
  const data = [
    { label: "Internal", value: 45, color: isDark ? "#6366f1" : "#3b82f6" },
    { label: "External", value: 30, color: isDark ? "#8b5cf6" : "#8b5cf6" },
    { label: "Backlinks", value: 25, color: isDark ? "#10b981" : "#22c55e" },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <Card
      sx={{
        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
        p: 2,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {/* Pie Chart Visualization */}
          <Box
            sx={{
              width: 200,
              height: 200,
              position: "relative",
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            <svg width="200" height="200" viewBox="0 0 200 200">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;

                const x1 = 100 + 100 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 100 + 100 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 100 + 100 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 100 + 100 * Math.sin((endAngle * Math.PI) / 180);

                const largeArc = angle > 180 ? 1 : 0;

                const pathData = [
                  `M 100 100`,
                  `L ${x1} ${y1}`,
                  `A 100 100 0 ${largeArc} 1 ${x2} ${y2}`,
                  `Z`,
                ].join(" ");

                currentAngle += angle;

                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={item.color}
                    stroke={isDark ? "#1f2937" : "#fff"}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </Box>

          {/* Legend */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.map((item, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "4px",
                    bgcolor: item.color,
                  }}
                />
                <Box
                  sx={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
                    fontSize: "0.875rem",
                  }}
                >
                  {item.label}: {item.value}%
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CustomPieChart;

