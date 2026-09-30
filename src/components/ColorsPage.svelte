<script lang="ts">
  import { tagDb, colorLabel, sortColorsByHue, type ColorEntry } from '../stores/tag-db.svelte'
  import { writtenStore, WRITTEN_KEY_SEPARATOR } from '../stores/written.svelte'
  import { t } from '../lib/i18n'

  // 单选大类筛选（同写入页），选中哪个大类就展开其下全部材料的颜色
  let selectedCategory = $state(tagDb.categories[0] ?? '')

  // 数据库为静态打包数据，按材料缓存色相排序结果
  const colorsCache = new Map<string, ColorEntry[]>()
  function materialColors(category: string, material: string): ColorEntry[] {
    const key = `${category}${WRITTEN_KEY_SEPARATOR}${material}`
    let colors = colorsCache.get(key)
    if (!colors) {
      colors = sortColorsByHue(tagDb.getColors(category, material))
      colorsCache.set(key, colors)
    }
    return colors
  }

  function writtenInMaterial(category: string, material: string): number {
    let n = 0
    for (const c of materialColors(category, material)) {
      if (writtenStore.isWritten(category, material, c.name)) n++
    }
    return n
  }

  const totalCount = $derived.by(() => {
    let n = 0
    for (const mat of tagDb.getMaterials(selectedCategory)) {
      n += tagDb.getColors(selectedCategory, mat).length
    }
    return n
  })

  const writtenCount = $derived.by(() => {
    let n = 0
    for (const mat of tagDb.getMaterials(selectedCategory)) {
      n += writtenInMaterial(selectedCategory, mat)
    }
    return n
  })

  function toggleMark(category: string, material: string, color: string): void {
    if (writtenStore.isWritten(category, material, color)) {
      writtenStore.unmark(category, material, color)
    } else {
      writtenStore.mark(category, material, color)
    }
  }

  function swatchLabel(category: string, material: string, c: ColorEntry): string {
    const base = colorLabel(c.name, c.nameZh)
    return writtenStore.isWritten(category, material, c.name)
      ? `${base} · ${t('mark.written')}`
      : base
  }
</script>

<div class="flex flex-col overflow-y-auto px-4 pb-4 h-full bg-bg" role="tabpanel" aria-label="{t('tab.colors')}">

  <!-- Category pills（与写入页一致，单选，无「全部」） -->
  <div class="pt-3 pb-3">
    <label class="block text-[0.7rem] font-semibold text-dim mb-1.5 uppercase tracking-wider bg-none">{t('write.category')}</label>
    <div class="flex flex-wrap gap-1.5">
      {#each tagDb.categories as cat (cat)}
        <button
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors border {selectedCategory === cat ? 'bg-accent text-white border-accent' : 'bg-card text-dim border-border hover:border-dim'}"
          onclick={() => (selectedCategory = cat)}
        >
          {cat}
        </button>
      {/each}
    </div>
  </div>

  <!-- Selected category summary -->
  <div class="pb-2">
    <div class="flex items-baseline justify-between mb-0.5">
      <span class="text-sm font-bold text-text">{selectedCategory}</span>
      <span class="text-[0.65rem] text-dim">{writtenCount} / {totalCount} {t('colors.written_label')}</span>
    </div>
    <p class="text-[0.65rem] text-dim leading-relaxed">{t('colors.hint')}</p>
  </div>

  <!-- All materials of the selected category -->
  {#each tagDb.getMaterials(selectedCategory) as mat (mat)}
    <div class="mt-1.5">
      <div class="flex items-baseline justify-between mb-1.5">
        <h3 class="text-xs font-semibold text-dim">{mat}</h3>
        <span class="text-[0.6rem] text-dim">{t('colors.written_count').replace('{0}', String(writtenInMaterial(selectedCategory, mat))).replace('{1}', String(materialColors(selectedCategory, mat).length))}</span>
      </div>
      <div class="flex flex-wrap gap-2 pb-2">
        {#each materialColors(selectedCategory, mat) as c (c.name)}
          <button
            type="button"
            aria-pressed={writtenStore.isWritten(selectedCategory, mat, c.name)}
            class="group flex w-16 shrink-0 flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0"
            aria-label={swatchLabel(selectedCategory, mat, c)}
            title={swatchLabel(selectedCategory, mat, c)}
            onclick={() => toggleMark(selectedCategory, mat, c.name)}
          >
            <span
              class="relative block h-10 w-10 rounded-lg border-2 transition-colors {writtenStore.isWritten(selectedCategory, mat, c.name) ? 'border-green/50' : 'border-border group-hover:border-dim'}"
              style={c.secondaryColorCSS
                ? `background:linear-gradient(135deg, ${c.colorCSS} 50%, ${c.secondaryColorCSS} 50%)`
                : `background:${c.colorCSS}`}
            >
              {#if writtenStore.isWritten(selectedCategory, mat, c.name)}
                <span class="absolute -top-1 -right-1 z-10 h-2.5 w-2.5 rounded-full border-2 border-bg bg-green" aria-hidden="true"></span>
              {/if}
            </span>
            <span class="w-full text-center text-[0.55rem] leading-[1.2] text-dim line-clamp-2 break-words">{colorLabel(c.name, c.nameZh)}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>
