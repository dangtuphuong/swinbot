import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Typography, TextField, Button, Box } from "@mui/material";
import logo from "./logo.png";
import Papa from 'papaparse';
import './App.css';

const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

function App() {
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false); // State for dark theme
  const [inputPosition, setInputPosition] = useState({ top: 0, left: 0 }); // State to track input position

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    // Add event listener to listen for clicks on the document body
    document?.body?.addEventListener('click', handleClickOutside);
    return () => {
      // Clean up event listener when component unmounts
      document?.body?.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update input position on component mount
    updateInputPosition();
  }, []);

  const updateInputPosition = () => {
    if (inputRef?.current) {
      const { top, left } = inputRef?.current?.getBoundingClientRect() || {};
      setInputPosition({ top, left });
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api");
      setMessages(response?.data?.items || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  const handleChange = (e) => {
    const value = e?.target?.value;
    setUserInput(value);
    if (value.trim() === '') {
      setShowSuggestions(false);
    } else {
      handleSuggestions(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axios.post("http://localhost:5000/api/ask", {
        data: userInput.trim(),
      });
      setMessages([...response?.data?.items]);
      setUserInput("");
    } catch (error) {
      console.error("Error submitting message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSuggestions = debounce(async (inputVal) => {
    // Clear suggestions and hide suggestion box if input is empty
    if (!inputVal.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
  
    try {
      const response = await fetch('keywords.csv');
      const data = await response.text();
      const parsedData = Papa.parse(data, {
        header: false,
        skipEmptyLines: true
      });
  
      const filteredSuggestions = parsedData.data.reduce((acc, row) => {
        const lowerCaseInputVal = inputVal.toLowerCase();
        const lowerCaseRow = row[2].toLowerCase();
        if (lowerCaseRow.includes(lowerCaseInputVal)) {
          acc.push(row[0]);
        }
        return acc;
      }, []);
  
      setSuggestions(filteredSuggestions.slice(0, 6));
      setShowSuggestions(filteredSuggestions.length > 0);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, 300);
  
  

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
    setShowSuggestions(false);
  };

  const handleClickOutside = (e) => {
    // Check if the click target is not inside the inputRef
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      setShowSuggestions(false);
    }
  };

  // Function to toggle dark theme
  const toggleDarkTheme = () => {
    setDarkTheme(!darkTheme);
  };

  return (
    <div className={`App ${darkTheme ? 'dark-theme' : ''}`} style={{background: darkTheme ? "#222" : "#f5f5f5", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
<Container
  maxWidth="md"
  style={{
    position: "fixed",
    top: 0,
    width: "100%",
    background: darkTheme ? "#222" : "#f5f5f5",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    zIndex: 1000, // Ensure it appears above other content
  }}
>
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
    <a href="https://www.swinburneonline.edu.au/faqs/" target="_blank" rel="noopener noreferrer">
      <img src={logo} alt="Logo" style={{ width: "100px" }} />
    </a>
    <Typography variant="h4" style={{ color: darkTheme ? "#fff" : "#4285f4" }}>
      Swinburne ChatBot
    </Typography>
  </div>

  <Box
    display="flex"
    flexDirection="column"
    minHeight="60vh"
    maxHeight="60vh"
    overflow="auto"
    style={{
      border: `1px solid ${darkTheme ? "#555" : "#dadce0"}`,
      borderRadius: "8px",
      padding: "10px",
      backgroundColor: darkTheme ? "#444" : "white",
    }}
  >
    {messages.map((message, index) => (
      <Message key={index} message={message} />
    ))}
    <div ref={messagesEndRef} />
  </Box>

  <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
  <TextField
  inputRef={inputRef}
  multiline
  rows={2}
  variant="outlined"
  value={userInput}
  onChange={handleChange}
  onKeyPress={handleKeyPress}
  onFocus={(e) => {
    if (userInput.trim() !== '') {
      setShowSuggestions(true);
      handleSuggestions(userInput);
    }
  }}
  disabled={isSubmitting}
  fullWidth
  style={{
    backgroundColor: darkTheme ? "#555" : "white",
    borderRadius: "4px",
    marginBottom: "10px",
  }}
/>


    {showSuggestions && (
      <ul 
        style={{
          position: "fixed",
          top: inputPosition?.top + inputRef?.current?.clientHeight + 10, // Adjust 10 as needed
          left: inputPosition?.left,
          width: inputRef?.current?.clientWidth,
          backgroundColor: darkTheme ? "#555" : "white",
          borderRadius: "4px",
          border: `1px solid ${darkTheme ? "#777" : "#dadce0"}`,
          zIndex: 1
        }}
      >
        {suggestions.map((suggestion, index) => (
          <li key={index} onClick={() => handleSuggestionClick(suggestion)} style={{ color: darkTheme ? "#fff" : "#333" }}>
            {suggestion}
          </li>
        ))}
      </ul>
    )}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Button
        variant="contained"
        color="primary"
        type="submit"
        disabled={isSubmitting || !userInput.trim()?.length}
        style={{ borderRadius: "4px", backgroundColor: darkTheme ? "#333" : "#1976d2", color: "#fff", marginTop: "10px" }}
      >
        {isSubmitting ? "Submitting" : "Submit"}
      </Button>
      <Button
        variant="outlined"
        onClick={toggleDarkTheme}
        style={{ marginTop: "20px", color: darkTheme ? "#fff" : "#333", borderColor: darkTheme ? "#fff" : "#333" }}
      >
        {darkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
      </Button>
    </div>
  </form>

</Container>
    </div>
  );
}

const Message = ({ message }) => (
  <Box mb={2}>
    <Typography
      variant="body1"
      style={{
        backgroundColor: "#dadce0",
        padding: "10px",
        borderRadius: "4px",
      }}
    >
      <strong>{message.type === "ai" ? "Swinbot" : "User"}:</strong>{" "}
      {message.content}
    </Typography>
  </Box>
);

export default App;

