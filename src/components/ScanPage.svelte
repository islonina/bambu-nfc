<script lang="ts">
  import { bluetooth } from '../stores/bluetooth.svelte'
  import { tagDb, type LibraryMatch } from '../stores/tag-db.svelte'
  import { writeStore } from '../stores/write.svelte'
  import { writtenStore } from '../stores/written.svelte'
  import { readTag } from '../lib/nfc'
  import { formatNfcError } from '../lib/nfc-errors'
  import { t } from '../lib/i18n'
  import type { ParsedTag } from '../lib/nfc-parser'
  import { BookOpen, Check, RotateCw, Wrench } from '@lucide/svelte'
  import EmptyState from './EmptyState.svelte'
  import TagInfoCard from './TagInfoCard.svelte'

  let { active = true, ontabchange }: { active?: boolean; ontabchange?: (tab: string) => void } = $props()

  type ScanState = 'idle' | 'scanning' | 'result'

  let scanState: ScanState = $state('idle')
  let scanResult: ParsedTag | null = $state(null)
  let matchInfo: string | null = $state(null)
  let libraryMatch: LibraryMatch | null = $state(null)
  let scanTime: Date | null = $state(null)
  let scanError: string | null = $state(null)

  const scanAge = $derived.by(() => {
    if (!scanTime) return null
    const seconds = Math.floor((Date.now() - scanTime.getTime()) / 1000)
    if (seconds < 60) return t('scan.just_now')
    const minutes = Math.floor(seconds / 60)
    return t('scan.minutes_ago').replace('{0}', String(minutes))
  })

  async function doRead(): Promise<void> {
    if (!bluetooth.ultra) return
    // If showing an error, clear it and re-read.
    scanError = null
    scanState = 'scanning'
    scanResult = null
    matchInfo = null
    libraryMatch = null

    try {
      const result = await readTag(bluetooth.ultra)
      if (result) {
        scanResult = result.parsed
        libraryMatch = tagDb.findDumpByUid(result.uidHex)
        matchInfo = tagDb.findInLibrary(result.parsed, result.uidHex)
        scanTime = new Date()
        scanState = 'result'
      } else {
        // No card detected by the scan.
        scanError = t('scan.no_tag')
        scanState = scanResult ? 'result' : 'idle'
      }
    } catch (e: any) {
      scanError = formatNfcError(e.message)
      scanState = scanResult ? 'result' : 'idle'
    }
  }

  function goRepair(): void {
    if (!libraryMatch) return
    writeStore.selectFromLibrary(
      libraryMatch.category,
      libraryMatch.material,
      libraryMatch.color,
      libraryMatch.dump
    )
    ontabchange?.('write')
  }

  // 读到的卡按 UID 命中库中 dump 时，可一键标记 / 取消该颜色的已写卡记录
  const colorMarked = $derived(
    libraryMatch !== null &&
    writtenStore.isWritten(libraryMatch.category, libraryMatch.material, libraryMatch.color)
  )

  function toggleMarked(): void {
    if (!libraryMatch) return
    const { category, material, color } = libraryMatch
    if (writtenStore.isWritten(category, material, color)) {
      writtenStore.unmark(category, material, color)
    } else {
      writtenStore.mark(category, material, color)
    }
  }
</script>

<div class="flex flex-col h-full bg-bg" role="tabpanel" aria-label="{t('tab.scan')}">
  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto px-4">
    {#if scanState === 'idle' && !scanResult}
      <div class="flex flex-col items-center justify-center h-full">
        <EmptyState icon={BookOpen} text={t('scan.empty_text')} />
      </div>
    {:else if scanResult}
      <div class="py-4 animate-result-reveal">
        {#if scanAge}
          <div class="flex items-center gap-1.5 text-[0.65rem] text-dim mb-2.5">
            <RotateCw size={10} />
            {scanAge}
          </div>
        {/if}
        <TagInfoCard
          title={matchInfo || scanResult.detailedFilamentType || scanResult.filamentType}
          parsed={scanResult}
        />
      </div>
    {/if}
  </div>

  <!-- Fixed bottom buttons -->
  <div class="shrink-0 px-4 pb-4 pt-2 flex flex-col gap-2">
    {#if libraryMatch}
      <div class="flex gap-2">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 px-3 py-3 border rounded-[10px] text-xs font-semibold cursor-pointer transition-colors shrink-0 {colorMarked
            ? 'border-green/30 bg-card text-green hover:border-green/60'
            : 'border-border bg-card text-dim hover:border-accent hover:text-accent'}"
          onclick={toggleMarked}
          title={colorMarked ? t('mark.unmark_written') : t('mark.mark_written')}
        >
          <Check size={14} stroke-width={colorMarked ? 3 : 2} />
          {t(colorMarked ? 'mark.written' : 'mark.mark_written')}
        </button>
        <button
          class="flex items-center justify-center gap-2 px-5 py-3 border border-accent rounded-[10px] text-sm font-semibold cursor-pointer transition-colors flex-1 bg-card text-accent hover:bg-accent/10 disabled:opacity-35 disabled:cursor-not-allowed"
          onclick={goRepair}
          disabled={!bluetooth.isConnected}
        >
          <Wrench size={16} />
          {t('scan.repair')}
        </button>
      </div>
    {/if}
    <button
      class="relative flex items-center justify-center gap-2 px-5 py-3 border-none rounded-[10px] text-sm font-semibold cursor-pointer transition-colors w-full overflow-hidden {scanError ? 'bg-red text-white' : 'bg-accent text-white hover:bg-accent2 disabled:opacity-35 disabled:cursor-not-allowed'}"
      onclick={doRead}
      disabled={scanState === 'scanning' || (!scanError && !bluetooth.isConnected)}
    >
      {#if scanState === 'scanning'}
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
        <span>{t('scan.scanning')}</span>
      {:else if scanError}
        <span class="truncate text-xs font-normal" title={scanError}>{scanError}</span>
      {:else}
        {scanState === 'result' ? t('scan.button_again') : t('scan.button')}
      {/if}
    </button>
  </div>
</div>
