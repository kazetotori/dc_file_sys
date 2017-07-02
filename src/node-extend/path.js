const path = require('path');

path.rootDir = function (dir) {
    if (dir.length === 1) { return dir === '/' ? '' : dir; }

    let idx = dir.indexOf('/');
    if (idx === -1) { return dir; }

    if (idx === 0) { dir = dir.slice(1) }
    idx = dir.indexOf('/');
    if (idx === -1) { return dir; }

    idx = dir.indexOf('/');
    return dir.slice(0, idx);
}