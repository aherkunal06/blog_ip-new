"use client";

import React, { useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ImageIcon from "@mui/icons-material/Image";
import Image from "next/image";
import { useThemeContext } from "@/context/ThemeContext";

interface ImageUploaderProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  touched?: boolean;
  error?: string;
  accept?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  name,
  value,
  onChange,
  touched,
  error,
  accept = "image/*",
}) => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={onChange}
        style={{ display: "none" }}
      />
      <Box
        sx={{
          border: `2px dashed ${error && touched ? "#f44336" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
          borderRadius: 2,
          p: 3,
          textAlign: "center",
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
          cursor: "pointer",
          transition: "all 0.3s ease",
          "&:hover": {
            borderColor: error && touched ? "#f44336" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
          },
        }}
        onClick={handleClick}
      >
        {value ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "200px",
                borderRadius: "8px",
                marginBottom: "12px",
                overflow: "hidden",
              }}
            >
              <Image
                src={value}
                alt="Preview"
                fill
                style={{ objectFit: "contain" }}
                unoptimized
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Change Image
            </Button>
          </Box>
        ) : (
          <Box>
            <ImageIcon sx={{ fontSize: 48, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)", mb: 2 }} />
            <Typography
              variant="body2"
              sx={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                mb: 2,
              }}
            >
              Click to upload or drag and drop
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Select Image
            </Button>
          </Box>
        )}
      </Box>
      {error && touched && (
        <Typography variant="caption" sx={{ color: "#f44336", mt: 0.5, display: "block" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default ImageUploader;

