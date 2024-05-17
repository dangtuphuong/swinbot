import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Typography, TextField, Button, Box, CircularProgress } from "@mui/material";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import logo from "./logo.png";
import Papa from 'papaparse';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import './App.css';

const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
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
  const [questions, setQuestions] = useState([]);
  const { transcript, resetTranscript, listening } = useSpeechRecognition();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    document.body.addEventListener('click', handleClickOutside);
    return () => {
      document.body.removeEventListener('click', handleClickOutside);
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

  useEffect(() => {
    if (listening) {
      setUserInput(transcript);
    }
  }, [listening, transcript]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api");
      setMessages(response.data.items || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setUserInput(value);
    if (value.trim()) {
      handleSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const onSubmit = async (value) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("http://localhost:5000/api/ask", { data: value });
      setMessages([...response.data.items]);
      setQuestions(response?.data?.questions);
      setUserInput("");
      resetTranscript();
    } catch (error) {
      console.error("Error submitting message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSubmit(userInput.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleListening = (action) => {
    if (action === 'start') {
      SpeechRecognition.startListening({ continuous: true });
    } else if (action === 'stop') {
      SpeechRecognition.stopListening();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  };

  //for the inquiry suggestion when user input inquiry to chatbox
  const handleSuggestions = debounce(async (inputVal) => {
    if (!inputVal.trim()) {
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

  const toggleDarkTheme = () => {
    setDarkTheme(!darkTheme);
  };

  return (
    <div className={`App ${darkTheme ? 'dark-theme' : ''}`} style={{ background: darkTheme ? "#222" : "white", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Container maxWidth="md" style={{ padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
          <a href="https://www.swinburneonline.edu.au/faqs/" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Logo" style={{ width: "100px" }} />
          </a>
          <Typography variant="h4" style={{ color: darkTheme ? "#fff" : "rgb(235 39 62)", fontWeight: "600" }}>SWINBURNE CHATBOT</Typography>
        </div>
        <Box display="flex" flexDirection="column" minHeight="60vh" maxHeight="60vh" overflow="auto" style={{ border: `1px solid ${darkTheme ? "#555" : "#dadce0"}`, borderRadius: "8px", padding: "10px", backgroundColor: darkTheme ? "#444" : "white" }}>
          {messages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
          <div className="quesions-wrap">
            {questions?.map((question) => (
              <Button
                className="question-item"
                variant="outlined"
                size="small"
                style={{color:'rgb(235 39 62)',border:"1px solid rgb(235 39 62)"}}
                onClick={() => onSubmit(question)}
              >
                {question}
              </Button>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </Box>
        <form onSubmit={handleSubmit} style={{ marginTop: "20px", position: "relative" }}>
          <TextField ref={inputRef} multiline rows={3} variant="outlined" value={userInput} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isSubmitting} fullWidth style={{ backgroundColor: darkTheme ? "#555" : "white", borderRadius: "4px", marginBottom: "10px" }} onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} onFocus={() => setShowSuggestions(true)} />
          {showSuggestions && userInput && (
  <ul style={{ position: "absolute", top: "101px", left: 0, width: "100%", backgroundColor: darkTheme ? "#555" : "white", borderRadius: "4px", border: `1px solid ${darkTheme ? "#777" : "#dadce0"}`, zIndex: 1 }}>
    {suggestions.map((suggestion, index) => (
      <li key={index} onClick={() => handleSuggestionClick(suggestion)} style={{ color: darkTheme ? "#fff" : "#333" }}>{suggestion}</li>
    ))}
  </ul>
)}
          <Box className="buttons_last" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button variant="contained"  type="submit" disabled={isSubmitting || !userInput.trim()} style={{ borderRadius: "4px", backgroundColor: darkTheme ? "#333" : "rgb(235 39 62)", color: "#fff", marginTop: "10px" }}>{isSubmitting ? <CircularProgress size={24} style={{ color: "white" }} /> : "Submit"}</Button>
            <Button
              variant="contained"
              color="secondary"
              type="button"
              style={{  backgroundColor: darkTheme ? "#333" : "#fff", color: "rgb(235 39 62)"}}
              className="microphone-button"
              onMouseDown={() => toggleListening('start')}
              onMouseUp={() => toggleListening('stop')}
              onMouseLeave={() => toggleListening('stop')}
            >
               {listening ? <FontAwesomeIcon icon={faMicrophone} /> : <FontAwesomeIcon icon={faMicrophoneSlash} />}
            </Button>
           
          </Box>
        </form>
        <Button variant="outlined" onClick={toggleDarkTheme} style={{ marginTop: "20px", color: darkTheme ? "#fff" : "#333", borderColor: darkTheme ? "#fff" : "#333" }}>{darkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}</Button>
      </Container>
    </div>
  );
}

const Message = ({ message }) => (
  <Box mb={2} style={{ backgroundColor: "#dadce0", padding: "10px", borderRadius: "4px" }}>
    <Typography variant="body1"><strong>{message.type === "ai" ? "Swinbot" : "You"}:</strong> {message.content}</Typography>
  </Box>
);

export default App;
