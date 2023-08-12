import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import React, { useState } from 'react';
import icon from '../../assets/icon.png';
import discord from '../../assets/discord.png';
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
    let name: string = 'DiscordSync';
    if (message.name) {
      name = message.name;
    }
    name += ' ';

    if (message.avatar_url) {
      messageElemtnts.push(
        <>
          <div className="profile">
            <img alt="logo" src={message.avatar_url} width="30" height="30" />
            <span>{name}</span>
            <span>{date.toLocaleString()}</span>
          </div>
          <p>{message.content}</p>
        </>
      );
    } else if (message.name) {
      messageElemtnts.push(
        <>
          <div className="profile">
            <img alt="logo" src={discord} width="30" height="30" />
            <span>{name}</span>
            <span>{date.toLocaleString()}</span>
          </div>
          <p>{message.content}</p>
        </>
      );
    } else {
      messageElemtnts.push(
        <>
          <div className="profile">
            <img alt="logo" src={icon} width="30" height="30" />
            <span>{name}</span>
            <span>{date.toLocaleString()}</span>
          </div>
          <p>{message.content}</p>
        </>
      );
    }
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
