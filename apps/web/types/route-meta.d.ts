declare module '#app' {
  interface PageMeta {
    roles?: Array<'client' | 'provider' | 'admin'>
  }
}

export {}
