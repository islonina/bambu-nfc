<script lang="ts">
  import { writeStore } from './stores/write.svelte'
  import ConnectOverlay from './components/ConnectOverlay.svelte'
  import TopBar from './components/TopBar.svelte'
  import TabBar from './components/TabBar.svelte'
  import ColorsPage from './components/ColorsPage.svelte'
  import ScanPage from './components/ScanPage.svelte'
  import WritePage from './components/WritePage.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'

  // 默认进入颜色页（无需蓝牙），切到读取/写入时再按需弹出连接引导
  let activeTab: string = $state('colors')

  function switchTab(tab: string): void {
    activeTab = tab
    writeStore.closeColorDropdown()
  }
</script>

<ConnectOverlay hidden={activeTab === 'colors'} />
<TopBar />

<main class="relative" style="height:calc(100dvh - 48px - var(--spacing-tab-h) - var(--spacing-safe-b))">
  <div class="absolute inset-0 {activeTab === 'colors' ? '' : 'hidden'}" aria-hidden={activeTab !== 'colors'}>
    <ColorsPage />
  </div>
  <div class="absolute inset-0 {activeTab === 'scan' ? '' : 'hidden'}" aria-hidden={activeTab !== 'scan'}>
    <ScanPage active={activeTab === 'scan'} ontabchange={switchTab} />
  </div>
  <div class="absolute inset-0 {activeTab === 'write' ? '' : 'hidden'}" aria-hidden={activeTab !== 'write'}>
    <WritePage />
  </div>
</main>

<TabBar {activeTab} ontabchange={switchTab} />
<UpdatePrompt />
