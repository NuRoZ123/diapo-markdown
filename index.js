const {BrowserWindow, app, Menu} = require('electron');
const fs = require('fs/promises');
const hljs = require('highlight.js');
const process = require('process');

const DIAPOPATH = './diapo';
const TEMPHTML = 'temp.html';
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
    await main();

    await fs.writeFile(TEMPHTML, diapos[0] + '<link href="style.css" rel="stylesheet">');
    await window.loadFile(TEMPHTML);
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
    }
}

const previousDiapo = async () => {
    if(indexDiapo > 0) {
        indexDiapo--;
        await writeDiapo(indexDiapo);
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