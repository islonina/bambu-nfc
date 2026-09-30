<script lang="ts">
  import { tagDb, colorLabel, sortColorsByHue, type ColorEntry } from '../stores/tag-db.svelte'
  import { writtenStore, WRITTEN_KEY_SEPARATOR } from '../stores/written.svelte'
  import { t } from '../lib/i18n'
  import { Check, X } from '@lucide/svelte'

  // 单选大类筛选（同写入页），选中哪个大类就展开其下全部材料的颜色
  let selectedCategory = $state(tagDb.categories[0] ?? '')

  // 点选的颜色：两步操作防误触——点色块只选中，标记需再点底部操作栏按钮
  let selected = $state<{ cat: string; mat: string; entry: ColorEntry } | null>(null)

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

  const selectedMarked = $derived(
    selected !== null && writtenStore.isWritten(selected.cat, selected.mat, selected.entry.name)
  )

  function selectCategory(cat: string): void {
    selectedCategory = cat
    selected = null
  }

  function isSelected(category: string, material: string, color: string): boolean {
    return selected?.cat === category && selected?.mat === material && selected?.entry.name === color
  }

  function selectColor(category: string, material: string, entry: ColorEntry): void {
    if (isSelected(category, material, entry.name)) {
      selected = null
      return
    }
    selected = { cat: category, mat: material, entry }
  }

  function clearSelection(): void {
    selected = null
  }

  function toggleMark(category: string, material: string, color: string): void {
    if (writtenStore.isWritten(category, material, color)) {
      writtenStore.unmark(category, material, color)
    } else {
      writtenStore.mark(category, material, color)
    }
  }

  function toggleSelectedMark(): void {
    if (!selected) return
    toggleMark(selected.cat, selected.mat, selected.entry.name)
  }

  function swatchLabel(category: string, material: string, c: ColorEntry): string {
    const base = colorLabel(c.name, c.nameZh)
    return writtenStore.isWritten(category, material, c.name)
      ? `${base} · ${t('mark.written')}`
      : base
  }
</script>

<div class="flex flex-col h-full bg-bg" role="tabpanel" aria-label="{t('tab.colors')}">
  <div class="flex-1 overflow-y-auto px-4 pb-4">

    <!-- Category pills（与写入页一致，单选，无「全部」） -->
    <div class="pt-3 pb-3">
      <label class="block text-[0.7rem] font-semibold text-dim mb-1.5 uppercase tracking-wider bg-none">{t('write.category')}</label>
      <div class="flex flex-wrap gap-1.5">
        {#each tagDb.categories as cat (cat)}
          <button
            type="button"
            class="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors border {selectedCategory === cat ? 'bg-accent text-white border-accent' : 'bg-card text-dim border-border hover:border-dim'}"
            onclick={() => selectCategory(cat)}
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
              aria-pressed={isSelected(selectedCategory, mat, c.name)}
              class="group flex w-16 shrink-0 flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              aria-label={swatchLabel(selectedCategory, mat, c)}
              title={swatchLabel(selectedCategory, mat, c)}
              onclick={() => selectColor(selectedCategory, mat, c)}
            >
              <span
                class="relative block h-10 w-10 rounded-lg border-2 transition-all {isSelected(selectedCategory, mat, c.name) ? 'border-accent ring-2 ring-accent/30' : writtenStore.isWritten(selectedCategory, mat, c.name) ? 'border-green/50 group-hover:border-dim' : 'border-border group-hover:border-dim'}"
                style={c.secondaryColorCSS
                  ? `background:linear-gradient(135deg, ${c.colorCSS} 50%, ${c.secondaryColorCSS} 50%)`
                  : `background:${c.colorCSS}`}
              >
                {#if writtenStore.isWritten(selectedCategory, mat, c.name)}
                  <span class="absolute -top-1 -right-1 z-10 h-2.5 w-2.5 rounded-full border-2 border-bg bg-green" aria-hidden="true"></span>
                {/if}
                {#if isSelected(selectedCategory, mat, c.name)}
                  <span class="absolute inset-0 flex items-center justify-center">
                    <Check size={18} class="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" stroke="white" stroke-width={3} />
                  </span>
                {/if}
              </span>
              <span class="w-full text-center text-[0.55rem] leading-[1.2] line-clamp-2 break-words {isSelected(selectedCategory, mat, c.name) ? 'text-text' : 'text-dim'}">{colorLabel(c.name, c.nameZh)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Selection action bar: mark / unmark requires an explicit second click -->
  {#if selected}
    <div class="shrink-0 px-4 pb-4 pt-2 bg-card border-t border-border flex items-center gap-2">
      <span
        class="w-5 h-5 rounded border border-border shrink-0"
        style={selected.entry.secondaryColorCSS
          ? `background:linear-gradient(135deg, ${selected.entry.colorCSS} 50%, ${selected.entry.secondaryColorCSS} 50%)`
          : `background:${selected.entry.colorCSS}`}
        aria-hidden="true"
      ></span>
      <span class="text-xs font-semibold text-text truncate flex-1">{colorLabel(selected.entry.name, selected.entry.nameZh)}</span>
      <button
        type="button"
        class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-xs font-semibold cursor-pointer transition-colors shrink-0 {selectedMarked
          ? 'border border-green/30 bg-card text-green hover:border-green/60'
          : 'border-none bg-accent text-white hover:bg-accent2'}"
        onclick={toggleSelectedMark}
      >
        <Check size={14} stroke-width={selectedMarked ? 3 : 2} />
        {t(selectedMarked ? 'mark.unmark_written' : 'mark.mark_written')}
      </button>
      <button
        type="button"
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-transparent border border-border text-dim cursor-pointer transition-colors hover:border-dim hover:text-text"
        onclick={clearSelection}
        aria-label={t('colors.clear_selection')}
        title={t('colors.clear_selection')}
      >
        <X size={14} />
      </button>
    </div>
  {/if}
</div>
