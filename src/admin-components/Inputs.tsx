"use client";

import React from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { useThemeContext } from "@/context/ThemeContext";
import { FormikProps } from "formik";

interface InputsProps extends Omit<TextFieldProps, "name" | "value" | "onChange"> {
  data: Record<string, unknown> | Array<{ name: string; label: string }>;
  formik: FormikProps<Record<string, unknown>>;
  name?: string;
}

const Inputs: React.FC<InputsProps> = ({ data, formik, name, ...props }) => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // If data is an array, render multiple inputs
  if (Array.isArray(data)) {
    return (
      <>
        {data.map((item, index) => (
          <TextField
            key={index}
            {...props}
            name={item.name || `field_${index}`}
            label={item.label || ""}
            value={formik.values[item.name || `field_${index}`] || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched[item.name || `field_${index}`] &&
              !!formik.errors[item.name || `field_${index}`]
            }
            helperText={
              formik.touched[item.name || `field_${index}`] &&
              (formik.errors[item.name || `field_${index}`] as string)
            }
            sx={{
              ...props.sx,
              "& .MuiOutlinedInput-root": {
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
                color: isDark ? "#fff" : "#000",
                "& fieldset": {
                  borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                },
                "&:hover fieldset": {
                  borderColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: isDark ? "#fff" : "#1976d2",
                },
              },
              "& .MuiInputLabel-root": {
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              },
            }}
          />
        ))}
      </>
    );
  }

  // Single input
  return (
    <TextField
      {...props}
      name={name || data?.name || "input"}
      label={data?.label || ""}
      value={formik.values[name || data?.name || "input"] || ""}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={
        formik.touched[name || data?.name || "input"] &&
        !!formik.errors[name || data?.name || "input"]
      }
      helperText={
        formik.touched[name || data?.name || "input"] &&
        (formik.errors[name || data?.name || "input"] as string)
      }
      sx={{
        ...props.sx,
        "& .MuiOutlinedInput-root": {
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          color: isDark ? "#fff" : "#000",
          "& fieldset": {
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
          },
          "&:hover fieldset": {
            borderColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
          },
          "&.Mui-focused fieldset": {
            borderColor: isDark ? "#fff" : "#1976d2",
          },
        },
        "& .MuiInputLabel-root": {
          color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
        },
      }}
    />
  );
};

export default Inputs;

