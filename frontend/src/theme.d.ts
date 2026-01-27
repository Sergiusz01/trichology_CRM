import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    customColors: {
      darkText: string;
      lightGray: string;
      borderGray: string;
      textGray: string;
      blue: string;
      indigo: string;
      teal: string;
      green: string;
      orange: string;
      red: string;
      gray: string;
    };
  }
  interface ThemeOptions {
    customColors?: {
      darkText?: string;
      lightGray?: string;
      borderGray?: string;
      textGray?: string;
      blue?: string;
      indigo?: string;
      teal?: string;
      green?: string;
      orange?: string;
      red?: string;
      gray?: string;
    };
  }
}
