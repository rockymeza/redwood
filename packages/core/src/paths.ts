import path from 'path'
import fs from 'fs'

import findUp from 'findup-sync'

import { Paths, Pages } from './types'

const CONFIG_FILE_NAME = 'redwood.toml'

const PATH_API_DIR_FUNCTIONS = 'api/src/functions'
const PATH_API_DIR_GRAPHQL = 'api/src/graphql'
const PATH_WEB_ROUTES = 'web/src/Routes.js'
const PATH_WEB_DIR_PAGES = 'web/src/pages/'
const PATH_WEB_DIR_COMPONENTS = 'web/src/components'

/**
 * Search the parent directories for the Redwood configuration file.
 */
export const getConfigPath = (): string => {
  const configPath = findUp(CONFIG_FILE_NAME)
  if (!configPath) {
    throw new Error(
      `Could not find a "${CONFIG_FILE_NAME}" file, are you sure you're in a Redwood project?`
    )
  }
  return configPath
}

/**
 * The Redwood config file is used as an anchor for the base directory of a project.
 */
export const getBaseDir = (configPath: string = getConfigPath()): string => {
  return path.dirname(configPath)
}

/**
 * Path constants that are relevant to a Redwood project.
 */
export const getPaths = (BASE_DIR: string = getBaseDir()): Paths => {
  return {
    base: BASE_DIR,
    api: {
      functions: path.join(BASE_DIR, PATH_API_DIR_FUNCTIONS),
      graphql: path.join(BASE_DIR, PATH_API_DIR_GRAPHQL),
    },
    web: {
      routes: path.join(BASE_DIR, PATH_WEB_ROUTES),
      pages: path.join(BASE_DIR, PATH_WEB_DIR_PAGES),
      components: path.join(BASE_DIR, PATH_WEB_DIR_COMPONENTS),
    },
  }
}

/**
 * Recursively process the pages directory
 */
export const processPagesDir = (webPagesDir: string, prefix = []): Pages => {
  const deps: Pages = []
  const entries = fs.readdirSync(webPagesDir, { withFileTypes: true })

  // Iterate over a dir's entries, recursing as necessary into
  // subdirectories.
  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      // Actual JS files reside in a directory of the same name, so let's
      // construct the filename of the actual Page file.
      const testFile = path.join(webPagesDir, entry.name, entry.name + '.js')

      if (fs.existsSync(testFile)) {
        // If the Page exists, then construct the dependency object and push it
        // onto the deps array.
        const basename = path.posix.basename(entry.name, '.js')
        const importName = prefix.join() + basename
        const importFile = path.join('src', 'pages', ...prefix, basename)
        deps.push({
          const: importName,
          path: path.join(webPagesDir, entry.name),
          importStatement: `import ${importName} from '${importFile}'`,
        })
      } else {
        // If the Page doesn't exist then we are in a directory of Page
        // directories, so let's recurse into it and do the whole thing over
        // again.
        // @ts-ignore
        const newPrefix = prefix.concat(entry.name)
        deps.push(
          ...processPagesDir(path.join(webPagesDir, entry.name), newPrefix)
        )
      }
    }
  })
  return deps
}