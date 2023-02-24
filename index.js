const {BrowserWindow, app, Menu, ipcMain} = require('electron');
const fs = require('fs/promises');
const process = require('process');
const mdToDiapos = require('./mdCtrl.js');
const path = require("path");
const {slide} = require("./window/templates.js")

// path variable
const CURRENTPATH = process.cwd();
const DIAPOPATH = 'diapo';
const TEMPHTML = 'temp.html';
const MODEL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + "model.html";
const FULLURL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + TEMPHTML;

let windows;
let modelWindow;
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

const windowModel = () => {
    const window = new BrowserWindow({
        show:false,
        nodeIntegration: true,
        contextIsolation: true,
        enableRemoteModule: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // window.loadFile(TEMPHTML);
    window.once('ready-to-show', () => {
        window.show();
        window.maximize();
        // window.webContents.openDevTools()
    });


    return window;
}

const lauch = async () => {
    await app.whenReady();
    window = createWindow();
    modelWindow = windowModel()

    diapos = await mdToDiapos(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.md");

    await writeDiapo(0);

    await generateHtml(0);
    await modelWindow.loadFile(MODEL)
}

const writeDiapo = async (index) => {
    await fs.writeFile(FULLURL, diapos[index] + '<link href="style.css" rel="stylesheet">');
    await window.loadFile(FULLURL);

}

const nextDiapo = async () => {

    if(indexDiapo < diapos.length - 1) {
        indexDiapo++;
        await writeDiapo(indexDiapo);
        modelWindow.webContents.send("changeSlide", {diapo: diapos[indexDiapo], diapoLength : diapos.length, id:indexDiapo});
    }
}

const previousDiapo = async () => {
    if(indexDiapo > 0) {
        indexDiapo--;
        await writeDiapo(indexDiapo);
        modelWindow.webContents.send("changeSlide", {diapo: diapos[indexDiapo], diapoLength : diapos.length, id:indexDiapo});
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

const generateHtml = async (index) => {
    await fs.writeFile(MODEL, '<!DOCTYPE html>\n' + '<html lang="en">\n' + '<head>\n' + '    <meta charset="UTF-8">\n' + '    <title>Diaporama</title>\n')
    await fs.appendFile(MODEL, '    <link href="style.css" rel="stylesheet">\n')
    await fs.appendFile(MODEL, '    <link href="../window/base.css" rel="stylesheet">\n')
    await fs.appendFile(MODEL, '</head>\n' + '<body>\n')
    await fs.appendFile(MODEL,'    <div class="menu overflow">\n' + '    <div class="title">\n' + '            <span>DIAPOSITIVES</span>\n' + '      </div>\n')
    for (let i = 0; i < diapos.length; i++) {
        await fs.appendFile(MODEL, `${slide(diapos[i], i)}`)
    }
    await fs.appendFile(MODEL, '    </div>\n')
    await fs.appendFile(MODEL, '  <div class="column"><div class="current-slide" id="current-slide">\n' + diapos[index] +  '  </div><span class="timer" id="timer">00:00:00</span>\n</div>')
    await fs.appendFile(MODEL,
        '<script>\n' +
        '        const slideClick = (id) => {\n' +
        '            window.api.send("slideClick", id);\n' +
        '        }\n' +
        '\n' +
        '        window.api.receive("changeSlide", (data) => {\n' +
        '            for (let i = 0; i < data.diapoLength; i++) {\n' +
        '                document.getElementById(i).classList.remove(\'border\')\n' +
        '            }\n' +
        '            document.getElementById(data.id).classList.add(\'border\')\n' +
        '\n' +
        '            document.getElementById(\'current-slide\').innerHTML = data.diapo\n' +
        '\n' +
        '            document.getElementById(data.id).scrollIntoView({behavior: \'smooth\'})\n' +
        '        })\n' +
        '\n' +
        '        let longTimer = 0;\n' +
        '        let timerSpan;\n' +
        '\n' +
        '        window.onload = () => {\n' +
        '\n' +
        '            timerSpan = document.getElementById("timer");\n' +
        '\n' +
        '            //create a timer in js\n' +
        '            const timer = setInterval(function() {\n' +
        '                longTimer += 1;\n' +
        '                timerSpan.innerText = convertTime(longTimer);\n' +
        '            }, 1000);\n' +
        '        }\n' +
        '\n' +
        '        //convert variable longTimer to hh:mm:ss\n' +
        '        function convertTime(longTimer) {\n' +
        '            let hours = Math.floor(longTimer / 3600);\n' +
        '            let minutes = Math.floor((longTimer - (hours * 3600)) / 60);\n' +
        '            let seconds = longTimer - (hours * 3600) - (minutes * 60);\n' +
        '            if (hours < 10) {\n' +
        '                hours = "0" + hours;\n' +
        '            }\n' +
        '            if (minutes < 10) {\n' +
        '                minutes = "0" + minutes;\n' +
        '            }\n' +
        '            if (seconds < 10) {\n' +
        '                seconds = "0" + seconds;\n' +
        '            }\n' +
        '            return hours + ":" + minutes + ":" + seconds;\n' +
        '        }\n' +
        '\n' +
        '    </script>')
    await fs.appendFile(MODEL, '</body>\n</html>')

    await modelWindow.loadFile(MODEL)
}

ipcMain.on("slideClick", async (event, id) => {
    indexDiapo = id
    await writeDiapo(id)
    modelWindow.webContents.send("changeSlide", {diapo: diapos[id], diapoLength : diapos.length, id:indexDiapo});
});

Menu.setApplicationMenu(appMenu);
lauch();