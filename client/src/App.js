import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "./App.scss";

function App() {
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api')
      .then(res => setMessages(res?.data?.items || []))
      .catch(() => setMessages([]));
  },[])

  const onChange = (e) => {
    setUserInput(e?.target?.value)
  }

  const onAsk = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/ask', { data: userInput });
      setMessages(res?.data?.items || []);
      setUserInput('');
    } finally {
      return setIsSubmitting(false);
    }
  }

  return (
    <div className="App">
      <h1 id="page-title">Swinburne ChatBot</h1>

      <div id="content">
        <div id="chat">
         {messages?.map((mess, index) => (
            <div className="chat-item" key={index}>
              <span className="role">{mess.type}: </span>
              <span>{mess.content}</span>
            </div>
         ))}
        </div>

        <form id="user-input" onSubmit={onAsk}>
          <textarea
            rows={3}
            type="text"
            className='input-textarea'
            value={userInput}
            disabled={isSubmitting}
            onChange={onChange}
          />
          <button
            className='submit-button'
            disabled={isSubmitting}
            type="submit"
          >{isSubmitting ? 'Submiting' : 'Submit'}</button>
        </form>
      </div>
    </div>
  );
}

export default App;
