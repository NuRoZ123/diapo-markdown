const {BrowserWindow, app, Menu} = require('electron');
const fs = require('fs/promises');
const process = require('process');
const mdToDiapos = require('./mdCtrl.js');

// path variable
const CURRENTPATH = process.cwd();
const DIAPOPATH = 'diapo';
const TEMPHTML = 'temp.html';
const FULLURL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + TEMPHTML;

let windows;
let diapos = [];
let indexDiapo = 0;

const appMenu = Menu.buildFromTemplate([
    {
        label: 'diapos',
        submenu: [
            {
                label: 'next',
                accelerator: 'Right',
                click: async () => {
                    await nextDiapo();
                }
            },
            {
                label: 'previous',
                accelerator: 'Left',
                click: async () => {
                    await previousDiapo();
                }
            }
        ]
    }
]);

const createWindow = () => {
    const window = new BrowserWindow({
        width: 800,
        height: 600
    });

    window.once('ready-to-show', () => {
        window.show();
        window.maximize();
    });
    return window;
}

const lauch = async () => {
    await app.whenReady();
    window = createWindow();
    diapos = await mdToDiapos(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.md");

    await writeDiapo(0);
}

const writeDiapo = async (index) => {
    await fs.writeFile(FULLURL, diapos[index] + '<link href="style.css" rel="stylesheet">');
    await window.loadFile(FULLURL);
}

const nextDiapo = async () => {

    if(indexDiapo < diapos.length - 1) {
        indexDiapo++;
        await writeDiapo(indexDiapo);
    }
}

const previousDiapo = async () => {
    if(indexDiapo > 0) {
        indexDiapo--;
        await writeDiapo(indexDiapo);
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    } else {
        app.on('activate', () => {
            createWindow();
        });
    }
});

Menu.setApplicationMenu(appMenu);
lauch();