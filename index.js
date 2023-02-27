const {BrowserWindow, app, Menu, ipcMain} = require('electron');
const fsPromise = require('fs/promises');
const fs = require('fs');
const process = require('process');
const mdToDiapos = require('./mdCtrl.js');
const path = require("path");
const {slide} = require("./window/templates.js")
const decompress = require("decompress");
const {zip} = require("zip-a-folder");

// path variable
const CURRENTPATH = process.cwd();
const DIAPOPATH = 'diapo';
const TEMPHTML = 'temp.html';
const MODEL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + "model.html";
const FULLURL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + TEMPHTML;
const EXPORTPATH = "C:\\Users\\Public\\presentation.codeprez";

let window;
let modelWindow;
let windowImport;
let diapos = [];
let indexDiapo = 0;

const appMenu = Menu.buildFromTemplate([
    {
      label: "Fichiers",
      submenu: [
            {
                label: "Importer",
                accelerator: "CmdOrCtrl+I",
                click: async () => {
                    await importFunction();
                }
            },
            {
                label: "Exporter",
                accelerator: "CmdOrCtrl+E",
                click: async () => {
                    await exportFunction();
                }
            }
        ]
    },
    {
        label: 'Diapos',
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
        // window.webContents.openDevTools()
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
    if(!window) {
        window = createWindow();
    }

    if(!modelWindow) {
        modelWindow = windowModel();
    }

    if(!windowImport) {
        windowImport = windowModel();
    }

    // if diapo folder exist
    if (fs.existsSync(CURRENTPATH + "\\" + DIAPOPATH)) {
        diapos = await mdToDiapos(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.md");

        await writeDiapo(0);

        await generateHtml(0);
        await modelWindow.loadFile(MODEL);
        windowImport.hide();
        window.show();
        modelWindow.show();

    } else {
        await importFunction();
    }
}

const exportFunction = async () => {
    const splitPath = __dirname.split('\\');
    const exportPath = `${splitPath[0]}/${splitPath[1]}/${splitPath[2]}/Downloads/presentation.codeprez`
    await zip(CURRENTPATH + "\\" + DIAPOPATH, exportPath);
    modelWindow.webContents.send("exported", `presentation.codeprez exported at ${splitPath[0]}/${splitPath[1]}/${splitPath[2]}/Downloads`);
    console.log("exported", exportPath);
}

const importFunction = async () => {
    windowImport.show();
    await windowImport.loadFile(CURRENTPATH + "\\import.html");

    window.hide();
    modelWindow.hide();

    if (fs.existsSync(CURRENTPATH + "\\" + DIAPOPATH)) {
        await fsPromise.rm(CURRENTPATH + "\\" + DIAPOPATH, {recursive: true});
    }
}

const createDiapo = async (path) => {
    await fsPromise.mkdir(CURRENTPATH + "\\" + DIAPOPATH, {recursive: true});
    await fsPromise.copyFile(path, CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.zip");
    await decompress(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.zip", CURRENTPATH + "\\" + DIAPOPATH);
    await fsPromise.unlink(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.zip");

    const files = await fsPromise.readdir(CURRENTPATH + "\\" + DIAPOPATH);
    const subFile = await fsPromise.readdir(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0]);

    for (const file of subFile) {
        await fsPromise.rename(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0] + "\\" + file, CURRENTPATH + "\\" + DIAPOPATH + "\\" + file);
    }
    await fsPromise.rm(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0], {recursive: true});

    await lauch();
}

const writeDiapo = async (index) => {
    await fsPromise.writeFile(FULLURL, diapos[index] + '<link href="style.css" rel="stylesheet">');
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
    await fsPromise.writeFile(MODEL, '<!DOCTYPE html>\n' + '<html lang="en">\n' + '<head>\n' + '    <meta charset="UTF-8">\n' + '    <title>Diaporama</title>\n')
    await fsPromise.appendFile(MODEL, '    <link href="style.css" rel="stylesheet">\n')
    await fsPromise.appendFile(MODEL, '    <link href="../window/base.css" rel="stylesheet">\n')
    await fsPromise.appendFile(MODEL, '</head>\n' + '<body>\n')
    await fsPromise.appendFile(MODEL,'    <div class="menu overflow">\n' + '    <div class="title">\n' + '            <span>DIAPOSITIVES</span>\n' + '      </div>\n')
    for (let i = 0; i < diapos.length; i++) {
        await fsPromise.appendFile(MODEL, `${slide(diapos[i], i)}`)
    }
    await fsPromise.appendFile(MODEL, '    </div>\n')
    await fsPromise.appendFile(MODEL, '  <div class="column"><div class="current-slide" id="current-slide">\n' + diapos[index] +  '  </div><span class="timer" id="timer">00:00:00</span>\n</div>')
    await fsPromise.appendFile(MODEL,
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
        'window.api.receive("exported", (data) => {\n' +
        '            alert(data)\n' +
        '        })' +
        '    </script>')
    await fsPromise.appendFile(MODEL, '</body>\n</html>')

    await modelWindow.loadFile(MODEL)
}

ipcMain.on("slideClick", async (event, id) => {
    indexDiapo = id
    await writeDiapo(id)
    modelWindow.webContents.send("changeSlide", {diapo: diapos[id], diapoLength : diapos.length, id:indexDiapo});
});

ipcMain.on("import", async (event, path) => {
    await createDiapo(path);
});

Menu.setApplicationMenu(appMenu);
lauch();