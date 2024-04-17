const fs = require('fs');
const path = require('path');

const baseDir = './';
//example: 'ManagerTable.js': 'ShellTable.js',
const changes = {
  'ManagerTable.js': 'ShellTable.js',
  'ManagerService.js': 'ShellService.js',
  'ManagerList.jsx': 'ShellList.jsx',
  'ManagerListController.jsx': 'ShellListController.jsx'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function renameFile(filePath) {
  const fileName = path.basename(filePath);
  if (changes[fileName]) {
    const newFilePath = path.join(path.dirname(filePath), changes[fileName]);
    fs.rename(filePath, newFilePath, err => {
      if (err) {
        console.error(`Error renaming ${filePath} to ${newFilePath}:`, err);
      } else {
        console.log(`Renamed ${filePath} to ${newFilePath}`);
      }
    });
  }
}

walkDir(baseDir, renameFile);
