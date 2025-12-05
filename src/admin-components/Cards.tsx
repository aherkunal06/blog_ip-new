"use client";

import React from "react";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";

interface CardData {
  title: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
}

interface CardsProps {
  data?: CardData[];
}

const Cards: React.FC<CardsProps> = ({ data }) => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const isDark = theme === "dark";

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={3}>
      {data.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "#fff" : "#000",
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              boxShadow: isDark
                ? "0 4px 6px rgba(0,0,0,0.3)"
                : "0 2px 4px rgba(0,0,0,0.1)",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: isDark
                  ? "0 8px 12px rgba(0,0,0,0.4)"
                  : "0 4px 8px rgba(0,0,0,0.15)",
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                {card.icon && (
                  <Box
                    sx={{
                      color: isDark ? colors.primary : colors.primary,
                      fontSize: "2rem",
                    }}
                  >
                    {card.icon}
                  </Box>
                )}
                {card.change && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: card.change.startsWith("-") ? "error.main" : "success.main",
                      fontWeight: 600,
                    }}
                  >
                    {card.change.startsWith("-") ? card.change : `+${card.change}`}%
                  </Typography>
                )}
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: isDark ? "#fff" : "#000",
                }}
              >
                {card.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                }}
              >
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default Cards;

