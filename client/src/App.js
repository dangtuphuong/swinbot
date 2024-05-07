import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Typography, TextField, Button, Box, List, ListItem, ListItemText } from "@mui/material";
import "./App.scss";
import logo from "./logo.png"; // Import the logo.png file

function App() {
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [wordSuggestions, setWordSuggestions] = useState([]);
  const [shouldFetchSuggestions, setShouldFetchSuggestions] = useState(true); // State to control fetching suggestions
  const [isLoading, setIsLoading] = useState(false); // State to track loading state
  const [error, setError] = useState(false); // State to track error state
  const messagesEndRef = useRef(null);
    
  

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
    if (value.trim() !== "") {
      setShouldFetchSuggestions(true);
      fetchWordSuggestions(value); // Call fetchWordSuggestions with the user input
    } else {
      setShouldFetchSuggestions(false);
      setWordSuggestions([]);
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Set submitting to true before sending the message
    setShouldFetchSuggestions(false); // Stop fetching suggestions after submitting
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
      handleSubmit(e); // Call handleSubmit on Enter press
    }
  };

  const fetchWordSuggestions = async (input) => {
    try {
      setIsLoading(true); // Set loading state to true while fetching suggestions
      const response = await axios.post("http://localhost:5000/api/word_suggestions", { user_input: input }, { timeout: 30000 });
      console.log("Response from word suggestions API:", response.data); // Log the response data
      setWordSuggestions(response.data.suggestions || []);
      setIsLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching word suggestions:", error);
      setWordSuggestions([]);
      setError(error);
      setIsLoading(false);
    }
  };
  
  

  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      }}
    >
      {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
      <a href="https://www.swinburneonline.edu.au/faqs/" target="_blank" rel="noopener noreferrer">
        <img src={logo} alt="Logo" style={{ width: "100px" }} />
      </a>
      <Typography variant="h4" style={{ color: "#4285f4" }}>
        Swinburne ChatBot
      </Typography>
    </div>

{/* Messages */}
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
      {/* Render messages */}
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </Box>
{/* Form */}
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
      />
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

{/* Word Suggestions */}
{shouldFetchSuggestions && (
  <List style={{ marginTop: "20px" }}>
    {isLoading && <ListItem><ListItemText primary="Fetching suggestions..." /></ListItem>}
    {error && <ListItem><ListItemText primary="Error fetching suggestions" /></ListItem>}
    {!isLoading && !error && wordSuggestions.map((suggestion, index) => (
      <ListItem key={index} button onClick={() => setUserInput(suggestion)}>
        <ListItemText primary={suggestion} />
      </ListItem>
    ))}
  </List>
)}



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


