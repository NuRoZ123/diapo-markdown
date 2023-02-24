const hljs = require("highlight.js");
const fsPromise = require("fs/promises");
const fs = require("fs");
const process = require("process");
const md = require("markdown-it")({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, {language: lang}).value;
            } catch (__) {}
        }
        return '';
    },
})

hljs.configure({
    languages: ['javascript', 'css', 'html', 'xml', 'bash', 'json', 'markdown'],
    classPrefix: '',
});

const fileToString = async (filename) => {
    return fsPromise.readFile(filename, {encoding: "utf-8"});
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
    md.use(function(markdown) {
        markdown.renderer.rules.link_open = function(tokens, idx, options, env, self) {
            let href = tokens[idx].attrs[0][1];
            href = href.split('#')[0]
            if (href.startsWith('./assets/')) {
                const fileContents = fs.readFileSync(href.replace('./', './diapo/'), 'utf8');
                const code = `<code class="language-javascript">${fileContents}</code>`;
                return `<pre>${code}</pre>`;
            }
            return self.renderToken(tokens, idx, options);
        }
    });
    return md.render(mdStr, "js");
}


module.exports = async function(file) {
    const fileStr = await fileToString(file);
    const diaposMd = splitDiapo(fileStr);
    return diaposMdTodiaposHtml(diaposMd);
}