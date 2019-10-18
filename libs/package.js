const fs = require('fs')
const bach = require('bach')
const recursive = require('recursive-readdir')
const Path = require('path')
const CombinedStream = require('combined-stream2')
const stream = require('stream')
const minifyStream = require('minify-stream')
const _ = require('lodash')

const targetMainSrc = './src/main/js/'
const targetDestFolder = './target/main/js/'

const meta = {
  modules: [],
  moduleNum: 0,
  fileSize: 0,
  groupId: '',
  artifactId: ''
}

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
        meta.moduleNum++
        let moduleInfo = getModuleInfo(file)
        meta.modules.push(moduleInfo)
        let passThrough = new stream.PassThrough()
        combinedStream.append(passThrough)
        passThrough.write(generateModuleSeparator(file))
        passThrough.end()
        combinedStream.append(
          fs.createReadStream(file).pipe(
            minifyStream({ sourceMap: false })
          )
        )
      }
      if (!fs.existsSync(targetDestFolder)) {
        fs.mkdirSync(targetDestFolder, {
          recursive: true
        })
      }
      combinedStream.pipe(
        fs.createWriteStream(getFilePath().libFile).on(
          'finish',
          function () {
            let stat = fs.statSync(getFilePath().libFile, 'utf8')
            meta.fileSize = stat.size
            _.assign(meta, _.pick(getConfig(), ['groupId', 'artifactId']))
            fs.writeFileSync(getFilePath().metaFile, JSON.stringify(meta))
          }
        )
      )
    })
  }
}

function generateModuleSeparator (path) {
  let start = '\n[======================='
  let end = '=======================]\n'
  let moduleInfo = getModuleInfo(path)
  let package = 'p#' + moduleInfo.package + ';'
  let moduleName = 'm#' + moduleInfo.module
  return start + package + moduleName + end
}

function getModuleInfo (path) {
  return {
    package: Path.dirname(path).replace(targetMainSrc.substring(2, targetMainSrc.length), '').replace(Path.sep, '.'),
    module: Path.basename(path).replace('.js', '')
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
    libFile: targetDestFolder + config.artifactId + '-' + config.version + '.xlib',
    metaFile: targetDestFolder + config.artifactId + '-' + config.version + '.xmeta'
  }
}

module.exports = package
