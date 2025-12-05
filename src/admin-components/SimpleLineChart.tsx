"use client";

import React from "react";
import { Box, Card, CardContent } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";

const SimpleLineChart: React.FC = () => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // Generate sample data points
  const dataPoints = [30, 45, 35, 55, 40, 60, 50, 70, 65, 80, 75, 90];
  const maxValue = Math.max(...dataPoints);
  const minValue = Math.min(...dataPoints);
  const range = maxValue - minValue || 1;

  return (
    <Card
      sx={{
        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
        p: 2,
      }}
    >
      <CardContent>
        <Box
          sx={{
            height: 300,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          {dataPoints.map((value, index) => {
            const height = ((value - minValue) / range) * 100;
            return (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  height: `${height}%`,
                  minHeight: "20px",
                  background: `linear-gradient(180deg, ${
                    isDark ? "#6366f1" : "#3b82f6"
                  } 0%, ${isDark ? "#8b5cf6" : "#60a5fa"} 100%)`,
                  borderRadius: "4px 4px 0 0",
                  position: "relative",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    opacity: 0.8,
                    transform: "scaleY(1.05)",
                  },
                }}
              />
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SimpleLineChart;

