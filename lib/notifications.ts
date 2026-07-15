export type AppNotification = {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  createdAt: string
  read: boolean
}

const NOTIFICATIONS_KEY = "app_notifications"
const NOTIFICATIONS_UPDATED_EVENT = "app-notifications-updated"
const NOTIFICATION_LIMIT = 30

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readNotificationsFromStorage() {
  if (typeof window === "undefined") return []

  try {
    const value = window.localStorage.getItem(NOTIFICATIONS_KEY)
    return value ? (JSON.parse(value) as AppNotification[]) : []
  } catch {
    window.localStorage.removeItem(NOTIFICATIONS_KEY)
    return []
  }
}

function writeNotificationsToStorage(notifications: AppNotification[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, NOTIFICATION_LIMIT)))
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
}

export function getNotifications() {
  return readNotificationsFromStorage()
}

export function subscribeToNotifications(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === NOTIFICATIONS_KEY) onUpdate()
  }

  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate)
    window.removeEventListener("storage", handleStorage)
  }
}

export function addNotification(notification: Omit<AppNotification, "id" | "createdAt" | "read">) {
  const notifications = readNotificationsFromStorage()

  writeNotificationsToStorage([
    {
      ...notification,
      id: createId(),
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...notifications,
  ])
}

export function markAllNotificationsRead() {
  const notifications = readNotificationsFromStorage()
  writeNotificationsToStorage(notifications.map((notification) => ({ ...notification, read: true })))
}
