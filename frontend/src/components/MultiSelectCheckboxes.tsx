import { FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

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
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <FormGroup>
        {options.map((option) => (
          <FormControlLabel
            key={option}
            control={
              <Checkbox
                checked={value.includes(option)}
                onChange={() => handleChange(option)}
              />
            }
            label={option}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
}

