import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Typography, TextField, Button, Box } from "@mui/material";
import "./App.scss";
import logo from "./logo.png"; // Import the logo.png file

function App() {
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInput, setUserInput] = useState("");
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
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const submitMessage = async () => {
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <a href="https://www.swinburneonline.edu.au/faqs/" target="_blank" rel="noopener noreferrer">
          <img src={logo} alt="Logo" style={{ width: "100px" }} /> {/* Make the logo larger */}
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

export default App;;
