// Unregister any old service workers
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'all' }).then(clients => {
    clients.forEach(client => client.navigate(client.url))
  })
  return self.registration.unregister()
})
