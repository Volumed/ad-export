#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const {
    JSDOM
} = jsdom;
const archiver = require('archiver');
const Pageres = require('pageres');

const [,, ...args] = process.argv;
const delayTime = args[0];

const colorize = (...args) => ({
    black: `\x1b[30m${args.join(' ')}`,
    red: `\x1b[31m${args.join(' ')}`,
    green: `\x1b[32m${args.join(' ')}`,
    yellow: `\x1b[33m${args.join(' ')}`,
    blue: `\x1b[34m${args.join(' ')}`,
    magenta: `\x1b[35m${args.join(' ')}`,
    cyan: `\x1b[36m${args.join(' ')}`,
    white: `\x1b[37m${args.join(' ')}`,
    bgBlack: `\x1b[40m${args.join(' ')}\x1b[0m`,
    bgRed: `\x1b[41m${args.join(' ')}\x1b[0m`,
    bgGreen: `\x1b[42m${args.join(' ')}\x1b[0m`,
    bgYellow: `\x1b[43m${args.join(' ')}\x1b[0m`,
    bgBlue: `\x1b[44m${args.join(' ')}\x1b[0m`,
    bgMagenta: `\x1b[45m${args.join(' ')}\x1b[0m`,
    bgCyan: `\x1b[46m${args.join(' ')}\x1b[0m`,
    bgWhite: `\x1b[47m${args.join(' ')}\x1b[0m`
});

for (var i=0;i<=delayTime;i++) {
    if (i > 0) {
        (function(ind) {
            setTimeout(function(){
                console.log(colorize(ind + 's').magenta);
                if (ind == delayTime) {
                    console.log(colorize(colorize('Afbeeldingen aan het verwerken...').black).bgYellow);
                }
            }, 1000 * ind);
        })(i);
    }
}

function fromDir(startPath, filter, callback) {
    let files = fs.readdirSync(startPath);

    if (files === undefined || files.length == 0) {
        console.log(colorize("Folder is leeg").red);
    }

    for (let i = 0; i < files.length; i++) {
        let filename = path.join(startPath, files[i]);
        let stat = fs.lstatSync(filename);

        if (stat.isDirectory()) {
                fromDir(filename, filter, callback);
        } else if (filter.test(filename)) callback(filename);
    };
};

function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        archive
        .directory(source, false)
        .on('error', err => reject(err))
        .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

fromDir('./', /\.html$/, function (filename) {
    JSDOM.fromFile(filename).then(dom => {
        let title = dom.window.document.title;
        let adSizeMeta = dom.window.document.querySelector("meta[name='ad.size']").getAttribute('content');

        let adSize = title.match(/^\d+|\d+\b|\d+(?=\w)/g).map(function (v) {
            return +v;
        });
        let updateadSizeMeta = `<meta name="ad.size" content="width=${adSize[0]},height=${adSize[1]}">`;

        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }
            let result = data.replace(`<meta name="ad.size" content="${adSizeMeta}">`, updateadSizeMeta);

            fs.writeFile(filename, result, 'utf8', function (err) {
                let getFolder = filename.substring(0, filename.lastIndexOf("/"));

                zipDirectory(getFolder, `${title}.zip`);

                (async () => {
                    await new Pageres({delay: delayTime, filename: title, format: 'jpg'})
                        .src(filename, [`${adSize[0]}x${adSize[1]}`])
                        .dest('./')
                        .run();
                })();

                console.log(colorize(`Succes: ${title}`).green);
                if (err) return console.log(err);
            });
        });
    });
});

