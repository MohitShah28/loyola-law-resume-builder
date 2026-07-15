"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Bell, Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AppNotification, getNotifications, markAllNotificationsRead, subscribeToNotifications } from "@/lib/notifications"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getNotifications())

    refreshNotifications()
    return subscribeToNotifications(refreshNotifications)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications])

  const openNotifications = () => {
    setIsNotificationsOpen((isOpen) => !isOpen)
    markAllNotificationsRead()
  }

  return (
    <motion.header
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30"
    >
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={openNotifications}
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#4f46e5] text-[10px] font-semibold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">{notifications.length ? `${notifications.length} recent updates` : "No updates yet"}</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 border-b border-border/60 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{notification.type}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Notifications will appear here.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              MS
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.header>
  )
}
