<script lang="ts">
  import { tagDb, colorLabel, sortColorsByHue, type ColorEntry } from '../stores/tag-db.svelte'
  import { writtenStore, WRITTEN_KEY_SEPARATOR } from '../stores/written.svelte'
  import { t } from '../lib/i18n'

  const totalCount = $derived.by(() => {
    let n = 0
    for (const cat of tagDb.categories) {
      for (const mat of tagDb.getMaterials(cat)) n += tagDb.getColors(cat, mat).length
    }
    return n
  })

  // 库中颜色数（用于剔除数据库更新后残留的无效标记）
  const writtenCount = $derived.by(() => {
    let n = 0
    for (const key of writtenStore.keys) {
      const [cat, mat, color] = key.split(WRITTEN_KEY_SEPARATOR)
      if (tagDb.getMaterial(cat, mat)?.colors[color]) n++
    }
    return n
  })

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

  <!-- Header with summary -->
  <div class="pt-3">
    <div class="flex items-baseline justify-between mb-1">
      <label class="text-[0.7rem] font-semibold text-dim uppercase tracking-wider bg-none">{t('colors.title')}</label>
      <span class="text-[0.65rem] text-dim">{writtenCount} / {totalCount} {t('colors.written_label')}</span>
    </div>
    <p class="text-[0.65rem] text-dim leading-relaxed">{t('colors.hint')}</p>
  </div>

  {#each tagDb.categories as cat (cat)}
    <section class="mt-3 pt-3 border-t border-border/40">
      <h2 class="text-sm font-bold text-text">{cat}</h2>
      {#each tagDb.getMaterials(cat) as mat (mat)}
        <div class="mt-1.5">
          <div class="flex items-baseline justify-between mb-1.5">
            <h3 class="text-xs font-semibold text-dim">{mat}</h3>
            <span class="text-[0.6rem] text-dim">{t('colors.written_count').replace('{0}', String(writtenInMaterial(cat, mat))).replace('{1}', String(materialColors(cat, mat).length))}</span>
          </div>
          <div class="flex flex-wrap gap-2 pb-1">
            {#each materialColors(cat, mat) as c (c.name)}
              <button
                type="button"
                aria-pressed={writtenStore.isWritten(cat, mat, c.name)}
                class="group relative w-10 h-10 rounded-lg cursor-pointer transition-all border-2 hover:z-10 active:scale-95 {writtenStore.isWritten(cat, mat, c.name) ? 'border-green/50' : 'border-border hover:border-dim'}"
                style={c.secondaryColorCSS
                  ? `background:linear-gradient(135deg, ${c.colorCSS} 50%, ${c.secondaryColorCSS} 50%)`
                  : `background:${c.colorCSS}`}
                aria-label={swatchLabel(cat, mat, c)}
                title={swatchLabel(cat, mat, c)}
                onclick={() => toggleMark(cat, mat, c.name)}
              >
                {#if writtenStore.isWritten(cat, mat, c.name)}
                  <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green border-2 border-bg z-20" aria-hidden="true"></span>
                {/if}
                <!-- Name tooltip on hover -->
                <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[0.55rem] text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-card px-1.5 py-0.5 rounded">{colorLabel(c.name, c.nameZh)}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </section>
  {/each}
</div>
