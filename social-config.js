// SQL, social endpoint and cron deployed. Auth anonymous sign-in is still disabled.
// Enable only after Auth is enabled and the authenticated ranking endpoint is deployed.
window.SILHOUETTE_SOCIAL_CONFIG = Object.freeze({
  enabled: false,
  supabaseUrl: 'https://bboijzuzhgvfxqrsfatw.supabase.co',
  publishableKey: 'sb_publishable_IYGuSSUStiK95becoD-OQQ_aj_2sGIN',
  publicUrl: 'https://ypsimon981.github.io/silhouette/',
  rulesVersion: 'shapes-0.21.27-social1',
  brand: '10Shapes'
});
