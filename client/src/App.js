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

  const messagesEndRef = useRef(null);

  const stopWords = ['i', 'do', 'how', 'is', 'what', 'where', 'who', 'why', 'the', 'a', 'an'];

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api");
      setMessages(response.data.items || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
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
        data: userInput,
      });
      setMessages([...response.data.items]);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSuggestions = debounce(async (inputVal) => {
    if (!inputVal.trim()) {
      setShowSuggestions(false);
    } else {
      fetch('keywords.csv')
        .then(response => response.text())
        .then(data => {
          const parsedData = Papa.parse(data, {
            header: false,
            skipEmptyLines: true
          });

          let foundWords = [];

          const exactMatch = parsedData.data.filter(row => {
            return row[2].toLowerCase() === inputVal.toLowerCase();
          });

          const partialMatch = parsedData.data.filter(row => {
            return row[2].toLowerCase().includes(inputVal.toLowerCase());
          });

          const wordBoundaryMatch = parsedData.data.filter(row => {
            const words = row[2].toLowerCase().split(' ');
            return words.includes(inputVal.toLowerCase());
          });

          const regex = new RegExp(`\\b${inputVal.toLowerCase()}\\b`);
          const regexMatch = parsedData.data.filter(row => {
            return regex.test(row[2].toLowerCase());
          });

          const allMatches = [...exactMatch, ...partialMatch, ...wordBoundaryMatch, ...regexMatch];
          const filteredSuggestions = allMatches.map(row => row[0]);

          setSuggestions(filteredSuggestions.slice(0, 6));
          setShowSuggestions(filteredSuggestions.length > 0);

          console.log("Suggestions:", filteredSuggestions);
          console.log("Triggered by words:", [...new Set(foundWords)]);
        });
    }
  }, 300);

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
    setShowSuggestions(false);
  };

  // Function to toggle dark theme
  const toggleDarkTheme = () => {
    setDarkTheme(!darkTheme);
  };

  return (
    <div className={`App ${darkTheme ? 'dark-theme' : ''}`} style={{ background: darkTheme ? "#222" : "#f5f5f5", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
<Container
  maxWidth="md"
  style={{
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    position: "relative",
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
      multiline
      rows={3}
      variant="outlined"
      value={userInput}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      disabled={isSubmitting}
      fullWidth
      style={{
        backgroundColor: darkTheme ? "#555" : "white",
        borderRadius: "4px",
        marginBottom: "10px",
      }}
      onFocus={() => setShowSuggestions(true)}
    />
    {showSuggestions && (
      <ul style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, width: "100%", backgroundColor: darkTheme ? "#555" : "white", borderRadius: "4px", border: `1px solid ${darkTheme ? "#777" : "#dadce0"}`, zIndex: 1 }}>
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
        disabled={isSubmitting}
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
