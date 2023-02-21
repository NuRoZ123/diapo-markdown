const hljs = require("highlight.js");
const fs = require("fs/promises");
const md = require("markdown-it")({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, {language: lang}).value;
            } catch (__) {}
        }

        return '';
    }
});

hljs.configure({
    languages: ['javascript', 'css', 'html', 'xml', 'bash', 'json', 'markdown'],
    classPrefix: '',
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


module.exports = async function(file) {
    const fileStr = await fileToString(file);
    const diaposMd = splitDiapo(fileStr);
    return diaposMdTodiaposHtml(diaposMd);
}