/**
 * 已写卡颜色记录：记住「类别 / 材料 / 颜色」是否已写入过卡片，避免重复写卡浪费 FUID 卡。
 * 写卡成功后由 WritePage 自动标记，读取页 / 写入页也可手动标记或取消。
 * 持久化到 localStorage，跨会话保留。
 */
const STORAGE_KEY = 'bambu-nfc-written-colors'

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : []
  } catch {
    return []
  }
}

/** \u001f 作分隔符，避免颜色/材料名中可能出现的一般字符造成键冲突 */
export const WRITTEN_KEY_SEPARATOR = '\u001f'

function keyOf(category: string, material: string, color: string): string {
  return `${category}${WRITTEN_KEY_SEPARATOR}${material}${WRITTEN_KEY_SEPARATOR}${color}`
}

class WrittenStore {
  #keys = $state<string[]>(load())

  /** 全部已标记的颜色键（category<sep>material<sep>color），只读用途 */
  get keys(): string[] {
    return this.#keys
  }

  isWritten(category: string, material: string, color: string): boolean {
    return this.#keys.includes(keyOf(category, material, color))
  }

  mark(category: string, material: string, color: string): void {
    const key = keyOf(category, material, color)
    if (this.#keys.includes(key)) return
    this.#keys.push(key)
    this.#persist()
  }

  unmark(category: string, material: string, color: string): void {
    const idx = this.#keys.indexOf(keyOf(category, material, color))
    if (idx < 0) return
    this.#keys.splice(idx, 1)
    this.#persist()
  }

  #persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#keys))
    } catch {
      // localStorage 不可用（隐私模式 / 已满）时仅放弃持久化，内存状态不受影响
    }
  }
}

export const writtenStore = new WrittenStore()
