const CLIENT_ID_KEY = 'openindu_client_id'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getClientId() {
  let value = localStorage.getItem(CLIENT_ID_KEY)
  if (!value) {
    value = createId()
    localStorage.setItem(CLIENT_ID_KEY, value)
  }
  return value
}
