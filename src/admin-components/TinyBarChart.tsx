"use client";

import React from "react";
import { Box, Card, CardContent } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";

const TinyBarChart: React.FC = () => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // Generate sample data
  const dataPoints = [65, 45, 80, 55, 70, 60, 75, 50, 85, 40, 90, 35];
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
            height: 200,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 0.5,
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
                  minHeight: "10px",
                  background: `linear-gradient(180deg, ${
                    isDark ? "#10b981" : "#22c55e"
                  } 0%, ${isDark ? "#34d399" : "#4ade80"} 100%)`,
                  borderRadius: "2px 2px 0 0",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    opacity: 0.8,
                    transform: "scaleY(1.1)",
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

export default TinyBarChart;

