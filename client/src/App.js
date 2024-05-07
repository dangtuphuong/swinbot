import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Typography, TextField, Button, Box } from "@mui/material";
import logo from "./logo.png";
import Papa from 'papaparse';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false); // Track whether to show suggestions or not

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

 const handleSuggestions = async (inputVal) => {
  if (!inputVal.trim()) {
    setShowSuggestions(false); // Hide suggestions if there is no input value or only blank spaces
  } else {
    fetch('keywords.csv')
      .then(response => response.text())
      .then(data => {
        const parsedData = Papa.parse(data, {
          header: false,
          skipEmptyLines: true
        });

        let foundWords = [];

        const filteredSuggestions = parsedData.data.filter(row => {
          if (row[2]) {
            const words = row[2].toLowerCase().split(' ');
            const matchedWords = inputVal.toLowerCase().split(' ')
              .filter(word => words.includes(word) && !stopWords.includes(word));
            if (matchedWords.length) {
              foundWords.push(...matchedWords);
            }
            return matchedWords.length;
          }
          return false;
        }).map(row => row[0]);

        setSuggestions(filteredSuggestions.slice(0, 6));
        setShowSuggestions(filteredSuggestions.length > 0); // Show suggestions if there are any

        console.log("Suggestions:", filteredSuggestions);
        console.log("Triggered by words:", [...new Set(foundWords)]);
      });
  }
};
  

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
    setShowSuggestions(false); // Hide suggestions after selection
  };

  return (
    <Container
      maxWidth="md"
      className="App"
      style={{
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        position: "relative", // Position relative to contain suggestions
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <a href="https://www.swinburneonline.edu.au/faqs/" target="_blank" rel="noopener noreferrer">
          <img src={logo} alt="Logo" style={{ width: "100px" }} />
        </a>
        <Typography variant="h4" style={{ color: "#4285f4" }}>
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
          border: "1px solid #dadce0",
          borderRadius: "8px",
          padding: "10px",
          backgroundColor: "white",
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
            backgroundColor: "white",
            borderRadius: "4px",
            marginBottom: "10px",
          }}
          onFocus={() => setShowSuggestions(true)} // Show suggestions on focus
        />
        {showSuggestions && (
          <ul style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, width: "100%", backgroundColor: "white", borderRadius: "4px", border: "1px solid #dadce0", zIndex: 1 }}>
            {suggestions.map((suggestion, index) => (
              <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                {suggestion}
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={isSubmitting}
          style={{ borderRadius: "4px" }}
        >
          {isSubmitting ? "Submitting" : "Submit"}
        </Button>
      </form>
    </Container>
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