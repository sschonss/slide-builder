<template>
  <div class="app-layout">
    <SavingIndicator />
    <AppHeader />
    <main class="app-main">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: 'Inter', sans-serif;
  background: #0d1117;
  color: #e6edf3;
}
a { color: inherit; text-decoration: none; }
.app-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.app-main { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
</style>
