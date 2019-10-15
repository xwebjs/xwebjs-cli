const fs = require('fs')
const bach = require('bach')
const recursive = require('recursive-readdir')
const path = require('path')
const CombinedStream = require('combined-stream2')
const stream = require('stream')

const targetMainSrc = './src/main/js'
const targetDestFolder = './target/main/js'

function package () {
  let fileContents
  process.cwd()
  console.log('scanning the directories')
  if (fs.existsSync(targetMainSrc)) {
    let combinedStream = CombinedStream.create()
    recursive(targetMainSrc, function (err, files) {
      // `files` is an array of file paths
      console.log(files)
      for (const file of files) {
        let passThrough = new stream.PassThrough()
        combinedStream.append(passThrough)
        passThrough.write("\n---------\n")
        passThrough.end()
        combinedStream.append(fs.createReadStream(file))
      }
      if (!fs.existsSync(targetDestFolder)) {
        fs.mkdirSync(targetDestFolder, {
          recursive: true
        })
      }
      combinedStream.pipe(fs.createWriteStream(getFilePath().libFile))
    })
  }
}

function getConfig () {
  let pomData = fs.readFileSync('xpom.json', 'utf8')
  let config = JSON.parse(pomData)
  return config
}

function getFilePath () {
  let config = getConfig()
  return {
    libFile: targetDestFolder + config.package + '-' + config.version + '.lib',
    metaFile: config.package + '-' + config.version + '.meta'
  }
}

module.exports = package
