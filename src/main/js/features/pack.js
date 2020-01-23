const fs = require('fs')
const recursive = require('recursive-readdir')
const fsExtra = require('fs-extra')
const Path = require('path')
const CombinedStream = require('combined-stream2')
const stream = require('stream')
const minifyStream = require('minify-stream')
const replaceStream = require('stream-replace')
const _ = require('lodash')
const esprima = require('esprima')

const targetMainSrc = 'src/main/js'
const targetDestFolder = 'target/main/js'
// warning, should not hard file sep
const fileSepRegExp = new RegExp('\/', 'g')

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
  return grabModules(relativePath)
  .then(
    function (modules) {
      return optimizeOrder(modules)
    }
  ).then(
    function (modules) {
      return packageModules(relativePath, modules)
    }
  )
}

async function grabModules (relativePath) {
  try {
    return await new Promise((resolve, reject) => {
        let modules = []
        let totalFileNum = 0
        if (relativePath !== undefined) {
          process.chdir(relativePath)
        }
        if (!fs.existsSync(targetMainSrc)) {
          reject('Main source folder doesn\'t exist:' + targetMainSrc)
        }
        console.log('Scanning the directories recursively')
        recursive(targetMainSrc, function (err, files) {
            totalFileNum = files.length
            console.log('Total files number:' + totalFileNum)
            if (totalFileNum === 0) {
              reject('No module file found')
            }
            for (const filePath of files) {
              modules.push(
                {
                  info: getModuleInfo(filePath),
                  dependencies: getModuleDependencies(filePath),
                  filePath: filePath
                }
              )
            }
            resolve(modules)
          }
        )
      }
    )
  } catch (e) {
    throw new Error('Failed to pack:' + e)
  }
}

function optimizeOrder (modules) {
  let exportedModules = []
  appendModule(exportedModules, modules, modules)
  return exportedModules
}

function appendModule (expModules, modules, oModules) {
  let childModules = []
  _.forEach(modules,
    function (module, index) {
      if (_.includes(expModules, module)) {
        return
      }
      if (!_.isEmpty(module.dependencies)) {
        _.forEach(module.dependencies,
          function (depModuleFullPath, index) {
            let depModule = _.find(oModules, function (oModule) {
              return oModule.info.fullPath === depModuleFullPath
            })
            if (!_.isEmpty(depModule)) {
              childModules.push(depModule)
            }
          }
        )
        appendModule(expModules, childModules, oModules)
      }
      expModules.push(module)
    }
  )
}

async function packageModules (relativePath, modules) {
  try {
    return await new Promise((resolve, reject) => {
      if (relativePath !== undefined) {
        process.chdir(relativePath)
      }
      clean().then(
        function () {
          let meta = {
            modules: [],
            moduleNum: 0,
            fileSize: 0,
            groupId: '',
            artifactId: ''
          }
          let combinedStream = CombinedStream.create()
          for (const module of modules) {
            let file = module.filePath
            console.log('Append file:' + file)
            meta.modules.push(module.info)
            let passThrough = new stream.PassThrough()
            combinedStream.append(passThrough)
            passThrough.write(generateModuleSeparator(module.info))
            passThrough.end()
            combinedStream.append(
              fs.createReadStream(file).pipe(
                replaceStream(
                  /_x\.exportModule\(/g, '_x\.exportModule(\'' + module.info.fullPath + '\','
                )
              ).pipe(
                minifyStream({ sourceMap: false })
              )
            )
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
          if (!fs.existsSync(targetDestFolder)) {
            fs.mkdirSync(targetDestFolder, {
              recursive: true
            })
          }
        }
      )
    })
  } catch (e) {
    throw new Error('Failed to pack:' + e)
  }
}

function generateModuleSeparator (info) {
  let start = '\n//@moduleInfo('
  let end = ')\n'
  let moduleInfo = info
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
    module: modulePath,
    fullPath: (!_.isEmpty(packPath) ? packPath + '.' : '') + modulePath
  }
}

function getModuleDependencies (path) {
  let dependencies = []
  let moduleContent = fs.readFileSync(path, 'utf8')
  let syntaxTree = esprima.parseScript(moduleContent)
  // parsing depends on the position of the property imports as the first one
  try {
    let elements = syntaxTree.body[0].expression.arguments[0].properties[0].value.elements
    _.forEach(elements,
      function (dependency, index) {
        dependencies.push(dependency.value)
      }
    )
    return dependencies
  } catch (e) {
    throw new Error('Failed to get module dependencies information caused by:' + e)
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
