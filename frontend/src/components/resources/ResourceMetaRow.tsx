import { Box, Typography } from "@mui/material";

interface ResourceMetaRowProps {
  label: string;
  value: string | number;
  code?: boolean;
}

export function ResourceMetaRow({ label, value, code }: ResourceMetaRowProps) {
  const formattedValue = String(value);

  return (
    <Box className="resource-meta-row">
      <Typography color="text.secondary" component="span">
        {label}
      </Typography>
      {code ? (
        <Box className="code-pill resource-meta-code" component="code" title={formattedValue}>
          {value}
        </Box>
      ) : (
        <Typography component="strong" title={formattedValue}>
          {value}
        </Typography>
      )}
    </Box>
  );
}
