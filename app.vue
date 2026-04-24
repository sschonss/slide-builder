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
body {
  font-family: 'Inter', sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
.app-layout { display: flex; flex-direction: column; min-height: 100vh; }
.app-main { flex: 1; }
</style>
