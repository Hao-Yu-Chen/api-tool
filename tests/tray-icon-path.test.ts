import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { resolveTrayIconPath } from '@/../electron/tray-icon-path'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'tray-icon-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('resolveTrayIconPath 托盘图标路径解析', () => {
  it('打包环境从 resourcesPath 读取 icon.png', () => {
    const resources = join(tempDir, 'resources')
    mkdirSync(resources)
    writeFileSync(join(resources, 'icon.png'), 'fake-png')

    const result = resolveTrayIconPath({
      isPackaged: true,
      resourcesPath: resources,
      devDir: tempDir
    })

    expect(result).toBe(join(resources, 'icon.png'))
  })

  it('打包环境缺少 icon.png 时返回 null', () => {
    const resources = join(tempDir, 'resources')
    mkdirSync(resources)

    const result = resolveTrayIconPath({
      isPackaged: true,
      resourcesPath: resources,
      devDir: tempDir
    })

    expect(result).toBeNull()
  })

  it('开发环境从项目 build/icon.png 读取', () => {
    mkdirSync(join(tempDir, 'build'))
    writeFileSync(join(tempDir, 'build', 'icon.png'), 'fake-png')

    const result = resolveTrayIconPath({
      isPackaged: false,
      resourcesPath: join(tempDir, 'resources'),
      devDir: tempDir
    })

    expect(result).toBe(join(tempDir, 'build', 'icon.png'))
  })

  it('开发环境缺少 build/icon.png 时返回 null', () => {
    const result = resolveTrayIconPath({
      isPackaged: false,
      resourcesPath: join(tempDir, 'resources'),
      devDir: tempDir
    })

    expect(result).toBeNull()
  })
})
