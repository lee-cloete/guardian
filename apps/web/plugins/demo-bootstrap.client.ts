export default defineNuxtPlugin(async () => {
  const demoStore = useDemoStore()
  demoStore.hydrate()

  const sessionStore = useSessionStore()
  await sessionStore.hydrate()
})
