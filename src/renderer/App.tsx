import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useState } from 'react';
import icon from '../../assets/logo.png';

function Terminal() {
  const [messages, setMessages] = useState<string[]>(['']);

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('ipc-example', (arg) => {
    // eslint-disable-next-line no-console
    setMessages([...messages, `${arg}\n`]);
  });
  const date = new Date();

  return messages.map((message, index) =>
    index === 0 ? (
      <div />
    ) : (
      <>
        <div className="profile">
          <img alt="logo" src={icon} width="30" height="30" />
          <span>{date.toLocaleString()}</span>
        </div>
        <p>{message}</p>
      </>
    )
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Terminal />} />
      </Routes>
    </Router>
  );
}
