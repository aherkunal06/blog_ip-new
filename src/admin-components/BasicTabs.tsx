"use client";

import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";

interface TabData {
  label: string;
  content: React.ReactNode;
}

interface BasicTabsProps {
  tabs: TabData[];
  defaultTab?: number;
}

const BasicTabs: React.FC<BasicTabsProps> = ({ tabs, defaultTab = 0 }) => {
  const [value, setValue] = useState(defaultTab);
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "divider",
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs"
          sx={{
            "& .MuiTab-root": {
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              "&.Mui-selected": {
                color: isDark ? "#fff" : "#1976d2",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: isDark ? "#fff" : "#1976d2",
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          hidden={value !== index}
          id={`simple-tabpanel-${index}`}
          aria-labelledby={`simple-tab-${index}`}
        >
          {value === index && <Box sx={{ p: 3 }}>{tab.content}</Box>}
        </div>
      ))}
    </Box>
  );
};

export default BasicTabs;

