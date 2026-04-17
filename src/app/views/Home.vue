<template>
  <section id="main-search-page" class="main-search-page px-4">
    <div class="flex justify-center items-center pt-12 md:pt-24 flex-col">
      <TCGTitle
        variant="primary"
        class="from-gradient-light-from to-gradient-light-to dark:from-gradient-dark-from dark:to-gradient-dark-to bg-gradient-radial-light dark:bg-gradient-radial-dark gradient-text text-center"
      >
        Vue 3 Template + Clean Architecture</TCGTitle
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head'

import constants from '@/infrastructure/config/constants'
import TCGTitle from '@/app/components/Shared/TCGTitle/TCGTitle.vue'

useHead({
  title: 'Vue 3 Template + Clean Architecture',
  meta: constants.META_PAGE!,
})
</script>

<style scoped>
@media (max-width: 768px) {
  .gradient-text {
    font-size: 2rem !important;
  }
}
</style>
