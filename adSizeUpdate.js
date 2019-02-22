const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const {
    JSDOM
} = jsdom;

function fromDir(startPath, filter, callback) {
    let files = fs.readdirSync(startPath);

    for (let i = 0; i < files.length; i++) {
        let filename = path.join(startPath, files[i]);
        let stat = fs.lstatSync(filename);

        if (stat.isDirectory()) {
            if (filename.indexOf('adSizeUpdate') == -1) {
                fromDir(filename, filter, callback);
            }
        } else if (filter.test(filename)) callback(filename);
    };
};

fromDir('../', /\.html$/, function (filename) {
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
            var result = data.replace(`<meta name="ad.size" content="${adSizeMeta}">`, updateadSizeMeta);

            fs.writeFile(filename, result, 'utf8', function (err) {
                console.log(`Succes: ${adSize[0]}x${adSize[1]}`);
                if (err) return console.log(err);
            });
        });
    });
});
