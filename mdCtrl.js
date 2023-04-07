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
    html : true
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
            const token = tokens[idx]
            let href = tokens[idx].attrs[0][1]
            href = href.split('#')[0]
            if (href.startsWith('./assets/')) {
                const fileContents = fs.readFileSync(href.replace('./', './diapo/'), 'utf8');
                const code = `<code class="language-js">${hljs.highlight('javascript', fileContents).value}</code>`
                return `<pre class="js">${code}</pre>`
            }
            return self.renderToken(tokens, idx, options)
        };

        markdown.renderer.rules.fence = (tokens, idx, options, env, self) => {
            const token = tokens[idx]
            const code = token.content.trim()
            if (token.info === 'bash') {
                return `
                    <div class="flex-bash">
                        <img onclick="codeExecute()" src="../right.png" alt="">
                        <pre><code class="language-bash" id="code">${code}</code></pre>
                    </div>
                    <pre class="console-output" id="console-output">
                    </pre>
                    <script>
                    let code = document.getElementById('code')
                    let consoleOutput = document.getElementById('console-output')
                    
                    const codeExecute = () => {
                        console.log(code.innerText)
                        window.api.send("executeCode", code.innerText);
                    
                    }
                    
                    window.api.receive("consoleOutput", (data) => {
                            console.log(data)
                            consoleOutput.innerHTML = '<code>' + data.toString() + '</code>'
                        })
                    
                    </script>`
                } else if (token.info === 'js'){

                    return `<pre class="js"> <code class="language-js">${hljs.highlight('javascript', code).value}</code>
                    </pre>`
                }

                return self.renderToken(tokens, idx, options)
            }
    })
    return md.render(mdStr, "js")
}


module.exports = async function(file) {
    const fileStr = await fileToString(file);
    const diaposMd = splitDiapo(fileStr);
    return diaposMdTodiaposHtml(diaposMd);
}