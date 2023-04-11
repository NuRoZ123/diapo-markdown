const {BrowserWindow, app, Menu, ipcMain, dialog} = require('electron');
const fsPromise = require('fs/promises');
const fs = require('fs');
const process = require('process');
const mdToDiapos = require('./mdCtrl.js');
const path = require("path");
const {slide} = require("./window/templates.js")
const decompress = require("decompress");
const {zip} = require("zip-a-folder");
const { exec } = require('child_process');

// path variable
const CURRENTPATH = process.cwd();
const DIAPOPATH = 'diapo';
const DIAPOPATHTEMPSAVE = 'diaposave';
const TEMPHTML = 'temp.html';
const MODEL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + "model.html";
const FULLURL = CURRENTPATH + "\\" + DIAPOPATH + "\\" + TEMPHTML;

let window;
let modelWindow;
let windowImport;
let windowExport;
let diapos = [];
let indexDiapo = 0;

const appMenu = Menu.buildFromTemplate([
    {
      label: "Fichiers",
      submenu: [
            {
                label: "Ouvrir",
                accelerator: "CmdOrCtrl+O",
                click: async () => {
                    await importFunction();
                }
            },
            {
                label: "Enregistrer",
                accelerator: "CmdOrCtrl+E",
                click: async () => {
                    await registerFunction();
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
        show:false,
        nodeIntegration: true,
        contextIsolation: true,
        enableRemoteModule: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
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

    if(!windowExport) {
        windowExport = windowModel();
    }

    // if diapo folder exist
    if (fs.existsSync(CURRENTPATH + "\\" + DIAPOPATH)) {
        diapos = await mdToDiapos(CURRENTPATH + "\\" + DIAPOPATH + "\\presentation.md");

        await writeDiapo(0);

        await generateHtml(0);

        await modelWindow.loadFile(MODEL);
        if (fs.existsSync('./diapo')) {
            const json = require('./diapo/config.json')
            modelWindow.webContents.send("duration", json);
        }

        windowImport.hide();
        windowExport.hide();
        window.show();
        modelWindow.show();

    } else {
        await importFunction();
    }
}

const registerFunction = async () => {
    windowExport.show();
    windowImport.hide();
    window.hide();
    modelWindow.hide();

    await windowExport.loadFile(CURRENTPATH + "\\save.html");
}

const importFunction = async () => {
    windowImport.show();
    await windowImport.loadFile(CURRENTPATH + "\\import.html");

    window.hide();
    modelWindow.hide();
    windowExport.hide();

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
    if (files.length === 1) {
        const subFile = await fsPromise.readdir(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0]);

        for (const file of subFile) {
            await fsPromise.rename(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0] + "\\" + file, CURRENTPATH + "\\" + DIAPOPATH + "\\" + file);
        }
        await fsPromise.rm(CURRENTPATH + "\\" + DIAPOPATH + "\\" + files[0], {recursive: true});
    }
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
        '        \n' +
        '        let json\n' +
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
        '            let totalTime = longTimer / 60;\n'+
        '            let minutes = Math.floor((longTimer - (hours * 3600)) / 60);\n' +
        '            let seconds = longTimer - (hours * 3600) - (minutes * 60);\n' +
        '            if (totalTime >= parseInt(json.duration)) {\n' +
        '                document.getElementById("timer").classList.add("red")\n' +
        '            }\n' +
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
        '        window.api.receive("exported", (data) => {\n' +
        '            alert(data)\n' +
        '        })\n' +
        '\n' +
        '        window.api.receive("duration", (data) => {\n' +
        '            json = data\n' +
        '        })\n' +
        '    \n' +
        '    </script>' +
        '<script>\n' +
        '                    let code = document.getElementById("code")\n' +
        '                    let consoleOutput = document.getElementById("console-output")\n' +
        '                    \n' +
        '                    const codeExecute = () => {\n' +
        '                        console.log(code.innerText)\n' +
        '                        window.api.send("executeCode", code.innerText);\n' +
        '                    \n' +
        '                    }\n' +
        '                    \n' +
        '                    window.api.receive("consoleOutput", (data) => {\n' +
        '                            console.log(data)\n' +
        '                            consoleOutput.innerHTML = "<code>" + data.toString() + "</code>"\n' +
        '                        })\n ' +
        '                   \n ' +
        '                   </script>')
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

ipcMain.on("executeCode", async (event, command) => {
    console.log(command)
    exec(command, (error, stdout, stderr) => {
        if (error) {
            modelWindow.webContents.send("consoleOutput", `${error.message}\n`)
            window.webContents.send("consoleOutput", `${error.message}\n`)
            return
        }
        if (stderr) {
            modelWindow.webContents.send("consoleOutput", `${stderr}\n`)
            window.webContents.send("consoleOutput", `${stderr}\n`)
            return
        }
        modelWindow.webContents.send("consoleOutput", `${stdout}`)
        window.webContents.send("consoleOutput", `${stdout}`)

    })
})

ipcMain.on("save", async (event, jsonInfo) => {
    const result = await dialog.showSaveDialog(windowExport, {properties: ['openDirectory']});
    if (!result.canceled) {
        if (fs.existsSync(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE)) {
            fs.rmSync(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE, {recursive: true});
        }

        await fsPromise.mkdir(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE);

        const mdFileName = jsonInfo.markdown.split("\\").pop();
        await fsPromise.copyFile(jsonInfo.markdown, CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\" + mdFileName);

        const cssFileName = jsonInfo.style.split("\\").pop();
        await fsPromise.copyFile(jsonInfo.style, CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\" + cssFileName);

        await fsPromise.mkdir(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\" + "assets");
        for(const asset of jsonInfo.assets) {
            const assetName = asset.split("\\").pop();
            await fsPromise.copyFile(asset, CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\assets\\" + assetName);
        }

        await fsPromise.mkdir(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\" + "env")
        for(const env of jsonInfo.env) {
            const envName = env.split("\\").pop();
            await fsPromise.copyFile(env, CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\env\\" + envName);
        }

        const config = {
            "title": jsonInfo.title,
            "authors": jsonInfo.authors.split(";"),
            "duration": jsonInfo.duration,
        }
        await fsPromise.writeFile(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE + "\\" + "config.json", JSON.stringify(config));
        await zip(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE, result.filePath + ".codeprez");
        modelWindow.webContents.send("exported", `${result.filePath}.codeprez exported !`);

        await fsPromise.rm(CURRENTPATH + "\\" + DIAPOPATHTEMPSAVE, {recursive: true});
        await importFunction();
    }

});
Menu.setApplicationMenu(appMenu);
if(fs.existsSync(CURRENTPATH + "\\" + DIAPOPATH)) {
    fs.rmSync(CURRENTPATH + "\\" + DIAPOPATH, {recursive: true});
}
lauch();