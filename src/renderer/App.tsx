import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useState } from 'react';

function Terminal() {
  const [messages, setMessages] = useState(['']);

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('ipc-example', (arg) => {
    // eslint-disable-next-line no-console
    const date = new Date();
    setMessages([...messages, `${date.toLocaleString()}：${arg}`]);
  });

  return <textarea disabled value={messages.join('\n')} />;
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
