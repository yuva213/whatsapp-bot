import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgPath = path.resolve(__dirname, '../node_modules/whatsapp-rust-bridge/package.json')

if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    let modified = false

    if (!pkg.main) {
      pkg.main = './dist/index.js'
      modified = true
    }
    if (!pkg.module) {
      pkg.module = './dist/index.js'
      modified = true
    }
    if (pkg.exports && pkg.exports['.'] && !pkg.exports['.'].require) {
      pkg.exports['.'].require = './dist/index.js'
      pkg.exports['.'].default = './dist/index.js'
      modified = true
    }

    if (modified) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
      console.log('✅ [Patch] whatsapp-rust-bridge package.json patched for Node.js compatibility.')
    }
  } catch (err) {
    console.error('Failed to patch whatsapp-rust-bridge:', err)
  }
}
