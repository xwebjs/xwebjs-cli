const fs = require('fs')
const bach = require('bach')
const recursive = require('recursive-readdir')
const fsExtra = require('fs-extra')
const Path = require('path')
const CombinedStream = require('combined-stream2')
const stream = require('stream')
const minifyStream = require('minify-stream')
const _ = require('lodash')

const targetMainSrc = 'src/main/js'
const targetDestFolder = 'target/main/js'
// warning, should not hard file sep
const fileSepRegExp = new RegExp('\/', 'g')

const meta = {
  modules: [],
  moduleNum: 0,
  fileSize: 0,
  groupId: '',
  artifactId: ''
}

function clean () {
  return fsExtra.pathExists(targetDestFolder)
  .then(exists => {
    if (exists) {
      fsExtra.emptyDirSync(targetDestFolder)
    }
  }).catch(
    function (err) {
      console.log('Failed to clean because:' + err)
    }
  )
}

async function pack (relativePath) {
  try {
    return await new Promise((resolve, reject) => {
      if (relativePath !== undefined) {
        process.chdir(relativePath)
      }
      console.log('The current directory:' + process.cwd())
      console.log('Cleaning target folder:' + targetDestFolder)
      clean().then(
        function () {
          if (fs.existsSync(targetMainSrc)) {
            let combinedStream = CombinedStream.create()
            let totalFileNum = 0
            console.log('scanning the directories')
            recursive(targetMainSrc, function (err, files) {
              // `files` is an array of file paths
              console.log(files)
              totalFileNum = files.length
              console.log('Total files number:' + totalFileNum)
              if (totalFileNum === 0) {
                reject("No module file found")
                return
              }
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
                    _.assign(meta, _.pick(getConfig(), ['groupId', 'artifactId', 'version']))
                    fs.writeFileSync(getFilePath().metaFile, JSON.stringify(meta))
                    resolve()
                  }
                )
              )
            })
          }
        }
      )
    })
  } catch (e) {
    throw new Error('Failed to pack:' + e)
  }
}

function generateModuleSeparator (path) {
  let start = '[======================='
  let end = '=======================]'
  let moduleInfo = getModuleInfo(path)
  let pack = 'p#' + moduleInfo.pack + ';'
  let moduleName = 'm#' + moduleInfo.module
  return start + pack + moduleName + end
}

function getModuleInfo (path) {
  let packPath, modulePath
  packPath = Path.dirname(path)
  .replace(targetMainSrc, '')
  .replace(fileSepRegExp, '.')
  if (packPath.startsWith('.')) {
    packPath = packPath.substring(1, packPath.length)
  }
  modulePath = Path.basename(path)
  .replace('.js', '')
  return {
    pack: packPath,
    module: modulePath
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
    libFile: targetDestFolder + Path.sep + config.artifactId + '-' + config.version + '.xlib',
    metaFile: targetDestFolder + Path.sep + config.artifactId + '-' + config.version + '.xmeta'
  }
}

module.exports = pack
