import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import React, { useState } from 'react';
import icon from '../../assets/icon.png';
import { IpcMessage } from './type';

function Terminal() {
  const [messages, setMessages] = useState<IpcMessage[]>([]);

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('ipc-example', (arg) => {
    // eslint-disable-next-line no-console
    setMessages([...messages, arg as IpcMessage]);
  });
  const date = new Date();

  const messageElemtnts: React.JSX.Element[] = [];

  // eslint-disable-next-line array-callback-return
  messages.map((message) => {
    messageElemtnts.push(
      <>
        <div className="profile">
          <img alt="logo" src={icon} width="30" height="30" />
          <span>{date.toLocaleString()}</span>
        </div>
        <p>{message.content}</p>
      </>
    );
  });

  return messageElemtnts;
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
