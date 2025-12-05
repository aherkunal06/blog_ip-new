"use client";

import React from "react";
import { Button, ButtonProps } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";

interface ButtonCompProps extends Omit<ButtonProps, "children"> {
  name: string;
}

const ButtonComp: React.FC<ButtonCompProps> = ({ name, ...props }) => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  return (
    <Button
      {...props}
      sx={{
        ...props.sx,
        ...(isDark && {
          "&.MuiButton-outlined": {
            borderColor: "rgba(255,255,255,0.3)",
            color: "rgba(255,255,255,0.9)",
            "&:hover": {
              borderColor: "rgba(255,255,255,0.5)",
              bgcolor: "rgba(255,255,255,0.1)",
            },
          },
          "&.MuiButton-contained": {
            bgcolor: "rgba(255,255,255,0.1)",
            color: "#fff",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.2)",
            },
          },
        }),
      }}
    >
      {name}
    </Button>
  );
};

export default ButtonComp;

