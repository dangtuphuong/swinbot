import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "./App.scss";

function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api')
      .then(res => setMessages(res.data));
  },[])

  const onAsk = () => {
    return axios.get('http://localhost:5000/api/ask')
      .then(res => setMessages(res.data));
  }

  return (
    <div className="App">
      <h1 id="page-title">Swinburne ChatBot</h1>

      <div id="content">
        <div id="chat">
         {messages?.map(mess => (
            <div className="chat-item">
              <span className="role">{mess.type}: </span>
              <span>{mess.content}</span>
            </div>
         ))}
        </div>
      </div>
    </div>
  );
}

export default App;
