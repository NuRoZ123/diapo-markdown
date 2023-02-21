const {BrowserWindow, app, Menu} = require('electron');
const fs = require('fs/promises');
const hljs = require('highlight.js');
const process = require('process');

const DIAPOPATH = './diapo';
const TEMPHTML = 'temp.html';
const MODEL = './window/index.html'
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

    // window.loadFile(TEMPHTML);
    window.once('ready-to-show', () => {
        window.show();
        window.maximize();
    });
    return window;
}

const windowModel = () => {
    const window = new BrowserWindow({show:false});

    // window.loadFile(TEMPHTML);
    window.once('ready-to-show', () => {
        window.show();
        window.maximize();
    });
    return window;
}

Menu.setApplicationMenu(appMenu);

const lauch = async () => {
    await app.whenReady();
    window = createWindow();
    modelWindow = windowModel()
    await main();
    await generateHtml(0)

    await fs.writeFile(TEMPHTML, diapos[0] + '<link href="style.css" rel="stylesheet">');
    await window.loadFile(TEMPHTML);
    await modelWindow.loadFile(MODEL)
}

const writeDiapo = async (index) => {
    console.log(process.cwd() + TEMPHTML);
    await fs.writeFile(TEMPHTML, diapos[index] + '<link href="style.css" rel="stylesheet">');

    await window.loadFile(TEMPHTML);
}

const nextDiapo = async () => {

    if(indexDiapo < diapos.length - 1) {
        indexDiapo++;
        await writeDiapo(indexDiapo);
        await generateHtml(indexDiapo)
    }
}

const previousDiapo = async () => {
    if(indexDiapo > 0) {
        indexDiapo--;
        await writeDiapo(indexDiapo);
        await generateHtml(indexDiapo)
    }
}

lauch();
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    } else {
        app.on('activate', () => {
            createWindow();
        });
    }
});

hljs.configure({
    languages: ['javascript', 'css', 'html', 'xml', 'bash', 'json', 'markdown'],
    classPrefix: '',
});

const md = require("markdown-it")({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, {language: lang}).value;
            } catch (__) {}
        }

        return ''; // use external default escaping
    }
});

const fileToString = async (filename) => {
    return fs.readFile(filename, {encoding: "utf-8"});
}

const splitDiapo = (str) => {
    str = str.split("---");
    return str;
}

const diaposMdTodiaposHtml = (diaposMd) => {

    let diaposHtml = []
    for(let diapoMd of diaposMd) {
        diaposHtml.push(mdToHtml(diapoMd));
    }
    return diaposHtml;
}

const mdToHtml = (mdStr) => {
    return md.render(mdStr, "js");
}


const main = async () => {
    const file = DIAPOPATH + "/presentation.md";
    const fileStr = await fileToString(file);
    const diaposMd = splitDiapo(fileStr);
    diapos = diaposMdTodiaposHtml(diaposMd);
}

const generateHtml = async (index) => {
    await fs.writeFile(MODEL, '<!DOCTYPE html>\n' + '<html lang="en">\n' + '<head>\n' + '    <meta charset="UTF-8">\n' + '    <title>Diaporama</title>\n')
    await fs.appendFile(MODEL, '    <link href="style.css" rel="stylesheet">\n')
    await fs.appendFile(MODEL, '    <link href="base.css" rel="stylesheet">\n')
    await fs.appendFile(MODEL, '</head>\n' + '<body>\n')
    await fs.appendFile(MODEL,'    <div class="menu overflow">\n' + '    <div class="title">\n' + '            <span>DIAPOSITIVES</span>\n' + '      </div>\n')
    for (let i = 0; i < diapos.length; i++) {
        if (i === index) {
            await fs.appendFile(MODEL, '    <div class="slide border">\n' + '\n'+ diapos[i] + '\n' + '    </div>\n');
        }else {
            await fs.appendFile(MODEL, '    <div class="slide">\n' + '\n'+ diapos[i] + '\n' + '    </div>\n');
        }

    }
    await fs.appendFile(MODEL, '    </div>\n')
    await fs.appendFile(MODEL, '  <div class="current-slide">\n' + diapos[index] +  '  </div>')
    await fs.appendFile(MODEL, '</body\n</html>')

    await modelWindow.loadFile(MODEL)
}