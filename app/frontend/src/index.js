import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import "./index.css";
import App from "./App";

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#01665e", 
      contrastText: "#ffffff", 
    },
    secondary: {
      main: "#80CDC1", 
    },
    text: {
      primary: "#003C30", 
    },
    background: {
      default: "#f8fdfc", 
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h5: { 
      fontSize: '1.5rem',
      fontWeight: 700,
      color: "#003C30"
    },
    h6: { 
      fontSize: '1.3rem',
      fontWeight: 700,
      color: "#003C30"
    },
    subtitle1: {
      fontSize: '1.1rem',
      fontWeight: 700,
      color: "#003C30"
    },
    body1: { 
      color: "#003C30" 
    },
  },
  components: {
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiSelect-select': {
            color: '#ffffff',
          },
          '& .MuiSvgIcon-root': {
            color: '#ffffff',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#80CDC1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#80CDC1',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#80CDC1',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
          '&.Mui-selected': {
            color: '#01665e',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #01665e',
          boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          '&.case-header': {
            border: '1px solid #01665e',
            boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
          },
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
