#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const {
    JSDOM
} = jsdom;
const archiver = require('archiver');

const colorize = (...args) => ({
    green: `\x1b[32m${args.join(' ')}`
});

function fromDir(startPath, filter, callback) {
    let files = fs.readdirSync(startPath);

    if (files === undefined || files.length == 0) {
        console.log("Niks gevonden");
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

                console.log(colorize(`Succes: ${title}`).green);
                if (err) return console.log(err);
            });
        });
    });
});

