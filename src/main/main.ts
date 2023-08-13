/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
// import { autoUpdater } from 'electron-updater';
// import log from 'electron-log';
import { Client } from 'discord.js-selfbot-v13';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { resolveHtmlPath } from './util';
import { Task } from './type';
import AuthValidate from './auth';
import { getHitChannels, sendWebhook } from './sync';

// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

let mainWindow: BrowserWindow | null = null;

// ipcMain.on('ipc-example', async (event, arg) => {
//   const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
//   console.log(msgTemplate(arg));
//   event.reply('ipc-example', msgTemplate('pong'));
// });

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    icon: getAssetPath('icon.png'),
    width: 530,
    resizable: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    let configPath: string;
    if (isDebug) {
      configPath = 'config.json';
    } else {
      configPath = path.join(process.resourcesPath, 'resources', 'config.json');
    }

    let data: any;
    try {
      data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      await AuthValidate(data.key);
    } catch (error: any) {
      mainWindow.webContents.send('ipc-example', {
        content: "config.json doesn't exist or invalid key",
      });
      mainWindow.webContents.send('ipc-example', {
        content: error.message,
      });
      return;
    }

    let tasksPath: string;
    if (isDebug) {
      tasksPath = 'tasks.csv';
    } else {
      tasksPath = path.join(process.resourcesPath, 'resources', 'tasks.csv');
    }

    const tasks: Task[] = [];
    try {
      const db = fs.readFileSync(tasksPath, 'utf8');
      const records = parse(db);
      records.forEach((record: any) => {
        if (record !== records[0]) {
          const task: Task = {
            monitor_channel: record[0],
            webhook_url: record[1],
            webhook_mention: record[2],
            webhook_user_name: record[3],
            webhook_avatar_url: record[4],
            webhook_reference_enabled: record[5],
            positive_keywords_type: record[6],
            positive_keywords: record[7],
            negative_keywords_type: record[8],
            negative_keywords: record[9],
          };
          tasks.push(task);
        }
      });
    } catch (error: any) {
      if (mainWindow) {
        mainWindow.webContents.send('ipc-example', {
          content: "tasks.csv doesn't exist or invalid format",
        });
        mainWindow.webContents.send('ipc-example', {
          content: error.message,
        });
      }
      return;
    }

    const client = new Client({
      // See other options here
      // https://discordjs-self-v13.netlify.app/#/docs/docs/main/typedef/ClientOptions
      // All partials are loaded automatically
      checkUpdate: false,
    });

    client
      .login(data.token)
      .then(() => {
        if (mainWindow !== null) {
          mainWindow.webContents.send('ipc-example', {
            content: 'login success',
          });
        }
      })
      .catch((error) => {
        if (mainWindow !== null) {
          mainWindow.webContents.send('ipc-example', {
            content: 'login failed',
          });
          mainWindow.webContents.send('ipc-example', {
            content: error.message,
          });
        }
      });

    client.on('ready', async () => {
      if (mainWindow !== null) {
        if (client.user !== null) {
          mainWindow.webContents.send('ipc-example', {
            content: `${client.user.username} is ready to listen`,
          });

          if (tasks.length === 0) {
            mainWindow.webContents.send('ipc-example', {
              content: 'no tasks found, please check tasks.csv',
            });
          }
        }
      }
    });

    client.on('error', async (error) => {
      if (mainWindow !== null) {
        mainWindow.webContents.send('ipc-example', {
          content: error.message,
        });
      }
    });

    client.on('messageCreate', async (message) => {
      const hitChannels = getHitChannels(tasks, message);

      if (hitChannels.length === 0) {
        return;
      }

      const errorMessages = sendWebhook(hitChannels, message);
      errorMessages.forEach((errorMessage) => {
        if (mainWindow !== null) {
          mainWindow.webContents.send('ipc-example', {
            content: errorMessage,
          });
        }
      });
      if (errorMessages.length > 0) {
        return;
      }

      if (mainWindow !== null) {
        if (message.content) {
          let cnt = message.content;
          if (message.attachments.size > 0) {
            message.attachments.forEach((attachment) => {
              cnt += `\n${attachment.url}`;
            });
          }
          mainWindow.webContents.send('ipc-example', {
            content: cnt,
            avatar_url: message.author.avatarURL(),
            name: message.author.displayName,
          });
        } else if (message.attachments.size > 0) {
          let cnt = '';
          message.attachments.forEach((attachment) => {
            cnt += `${attachment.url}\n`;
          });
          mainWindow.webContents.send('ipc-example', {
            content: cnt,
            avatar_url: message.author.avatarURL(),
            name: message.author.displayName,
          });
        }
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch((error) => {
    if (mainWindow !== null) {
      mainWindow.webContents.send('ipc-example', {
        content: error.message,
      });
    }
  });
