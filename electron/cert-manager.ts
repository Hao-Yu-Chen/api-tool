import fs from 'fs'
import os from 'os'
import path from 'path'
import net from 'net'
import forge from 'node-forge'

/**
 * HTTPS 解密所需的证书管理。
 *
 * 正向代理要改写 HTTPS 请求的 URL，必须先终结 TLS（MITM）：
 * 用本地根证书（CA）为被访问的主机动态签发一张服务器证书，
 * 浏览器信任该 CA 后，代理就能拿到明文请求，再按规则转发到任意目标（含 http）。
 *
 * 本模块不依赖 electron，便于单元测试。
 */

export const CA_COMMON_NAME = 'API Tool Proxy CA'

interface LoadedCA {
  key: forge.pki.PrivateKey
  cert: forge.pki.Certificate
  keyPem: string
  certPem: string
}

interface CertPair {
  key: string
  cert: string
}

let dirOverride: string | null = null
let loadedCA: LoadedCA | null = null
// 叶子证书复用同一把密钥，只为不同主机换证书，避免每次连接都做 RSA 密钥生成
let leafKey: { privateKey: forge.pki.PrivateKey; publicKey: forge.pki.PublicKey; pem: string } | null =
  null
const leafCache = new Map<string, CertPair>()

/** 指定证书存放目录（由主进程传入 userData） */
export function setCertDir(dir: string): void {
  dirOverride = dir
  loadedCA = null
  leafKey = null
  leafCache.clear()
}

function getCertDir(): string {
  if (dirOverride) return dirOverride
  const base = process.env.APPDATA || os.tmpdir()
  return path.join(base, 'api-tool', 'proxy-certs')
}

export function getCACertPath(): string {
  return path.join(getCertDir(), 'ca.cert.pem')
}

// ========== 根证书 ==========

function createCACertificate(): LoadedCA {
  const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })

  const cert = forge.pki.createCertificate()
  cert.publicKey = keyPair.publicKey
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(8))
  cert.validity.notBefore = new Date(Date.now() - 24 * 3600 * 1000)
  cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000)

  const attrs = [
    { name: 'commonName', value: CA_COMMON_NAME },
    { name: 'organizationName', value: 'API Tool' },
    { name: 'organizationalUnitName', value: 'Proxy' },
    { name: 'countryName', value: 'CN' }
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    {
      name: 'keyUsage',
      critical: true,
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true
    },
    { name: 'subjectKeyIdentifier' }
  ])
  cert.sign(keyPair.privateKey, forge.md.sha256.create())

  return {
    key: keyPair.privateKey,
    cert,
    keyPem: forge.pki.privateKeyToPem(keyPair.privateKey),
    certPem: forge.pki.certificateToPem(cert)
  }
}

/** 读取根证书，不存在则生成并持久化 */
export function ensureCA(): LoadedCA {
  if (loadedCA) return loadedCA

  const dir = getCertDir()
  const keyPath = path.join(dir, 'ca.key.pem')
  const certPath = getCACertPath()

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const keyPem = fs.readFileSync(keyPath, 'utf8')
      const certPem = fs.readFileSync(certPath, 'utf8')
      loadedCA = {
        key: forge.pki.privateKeyFromPem(keyPem),
        cert: forge.pki.certificateFromPem(certPem),
        keyPem,
        certPem
      }
      return loadedCA
    } catch (err: any) {
      console.warn('[cert-manager] 根证书读取失败，重新生成:', err?.message)
    }
  }

  fs.mkdirSync(dir, { recursive: true })
  loadedCA = createCACertificate()
  fs.writeFileSync(keyPath, loadedCA.keyPem, { mode: 0o600 })
  fs.writeFileSync(certPath, loadedCA.certPem)
  console.log('[cert-manager] 已生成根证书:', certPath)

  return loadedCA
}

export function getCACertPem(): string {
  return ensureCA().certPem
}

/** 根证书是否已生成（不检查是否已安装到系统） */
export function hasCA(): boolean {
  return fs.existsSync(getCACertPath())
}

// ========== 叶子证书 ==========

interface LeafKey {
  privateKey: forge.pki.PrivateKey
  publicKey: forge.pki.PublicKey
  pem: string
}

function getLeafKey(): LeafKey {
  if (leafKey) return leafKey

  const dir = getCertDir()
  fs.mkdirSync(dir, { recursive: true })
  const keyPath = path.join(dir, 'leaf.key.pem')

  let pem: string | null = null
  if (fs.existsSync(keyPath)) {
    pem = fs.readFileSync(keyPath, 'utf8')
  } else {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
    pem = forge.pki.privateKeyToPem(keyPair.privateKey)
    fs.writeFileSync(keyPath, pem, { mode: 0o600 })
  }

  const privateKey = forge.pki.privateKeyFromPem(pem)
  const publicKey = forge.pki.rsa.setPublicKey(
    (privateKey as any).n,
    (privateKey as any).e
  )
  leafKey = { privateKey, publicKey, pem }
  return leafKey
}

/**
 * 为指定主机签发服务器证书（带 SAN），结果按主机缓存
 */
export function issueCertificate(hostname: string): CertPair {
  const cached = leafCache.get(hostname)
  if (cached) return cached

  const ca = ensureCA()
  const leaf = getLeafKey()

  const cert = forge.pki.createCertificate()
  cert.publicKey = leaf.publicKey
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(8))
  cert.validity.notBefore = new Date(Date.now() - 24 * 3600 * 1000)
  cert.validity.notAfter = new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000)
  cert.setSubject([{ name: 'commonName', value: hostname }])
  cert.setIssuer(ca.cert.subject.attributes)

  const altNames: forge.pki.GeneralName[] = []
  if (net.isIP(hostname)) {
    altNames.push({ type: 7, ip: hostname } as forge.pki.GeneralName)
  } else {
    altNames.push({ type: 2, value: hostname } as forge.pki.GeneralName)
    // 主机名含多级域名时补一条泛域名，兼容子域
    if (hostname.split('.').length > 1) {
      altNames.push({ type: 2, value: `*.${hostname}` } as forge.pki.GeneralName)
    }
  }

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    { name: 'subjectAltName', altNames },
    { name: 'subjectKeyIdentifier' }
  ])
  cert.sign(ca.key, forge.md.sha256.create())

  const pair: CertPair = { key: leaf.pem, cert: forge.pki.certificateToPem(cert) }
  leafCache.set(hostname, pair)
  return pair
}

export function clearLeafCache(): void {
  leafCache.clear()
}
