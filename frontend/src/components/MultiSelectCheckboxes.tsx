import { FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, Grid } from '@mui/material';

interface MultiSelectCheckboxesProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

export default function MultiSelectCheckboxes({
  label,
  options,
  value = [],
  onChange,
}: MultiSelectCheckboxesProps) {
  const handleChange = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  return (
    <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
      <FormLabel
        component="legend"
        sx={{
          typography: 'subtitle2',
          fontWeight: 600,
          mb: 1,
          color: 'text.primary'
        }}
      >
        {label}
      </FormLabel>
      <FormGroup>
        <Grid container spacing={0}>
          {options.map((option) => (
            <Grid key={option} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={value.includes(option)}
                    onChange={() => handleChange(option)}
                  />
                }
                label={option}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>
          ))}
        </Grid>

      </FormGroup>
    </FormControl>
  );
}


