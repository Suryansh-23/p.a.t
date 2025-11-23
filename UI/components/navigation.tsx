"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PillNav from "@/components/PillNav"

const navItems = [
  { label: "Home", href: "/" },
  { label: "Deploy", href: "/deploy" },
  { label: "Explorer", href: "/explorer" },
]

export function Navigation() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === "dark"

  return (
    <div className="fixed left-0 right-0 top-4 z-50">
      <div className="relative mx-auto w-full px-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="absolute left-3 top-1/2 -translate-y-1/2 pl-1"
        >
          <Image
            src="/PAT.png"
            alt="P.A.T. Logo"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>
        <div className="flex justify-center pl-150">
          <PillNav
            logo="/globe.svg"
            logoAlt="Prop AMMs"
            items={navItems}
            activeHref={pathname}
            className="custom-nav"
            ease="power2.easeOut"
            baseColor="#0500E1"
            navBackground="transparent"
            logoBackground="rgba(5,6,17,0.85)"
            mobileMenuBackground="rgba(5,6,17,0.95)"
            pillColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
            hoveredPillTextColor="#ffffff"
            pillTextColor="#ffffff"
          />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-6">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </div>
    </div>
  )
}
