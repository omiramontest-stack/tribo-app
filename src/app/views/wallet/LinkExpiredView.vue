<template>
  <div style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px; background: #F7F4EF; font-family: inherit; text-align: center;">
    <div style="max-width: 360px; width: 100%;">
      <!-- Icon -->
      <div style="width: 72px; height: 72px; border-radius: 20px; background: #FEE2E2; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>

      <!-- Heading -->
      <h1 style="font-size: 22px; font-weight: 800; color: #0F1B14; margin: 0 0 10px; letter-spacing: -0.02em;">
        Este enlace ya no es válido
      </h1>
      <p style="font-size: 14px; color: #6B7A72; line-height: 1.6; margin: 0 0 32px;">
        El link que recibiste expiró o ya fue utilizado.<br>
        Pídele a la empresa que te envíe uno nuevo.
      </p>

      <!-- Subtle branding -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; opacity: 0.45;">
        <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#1B4332" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#1B4332" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#1B4332" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#1B4332"/>
          <circle cx="10" cy="28" r="3.5" fill="#1B4332"/>
          <circle cx="30" cy="28" r="3.5" fill="#1B4332"/>
        </svg>
        <span style="font-size: 12px; font-weight: 700; color: #1B4332; letter-spacing: -0.01em;">tribo</span>
      </div>
    </div>
  </div>
</template>
