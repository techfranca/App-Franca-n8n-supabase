import { Facebook, Instagram, Linkedin, InstagramIcon as Tiktok, Youtube } from "lucide-react"

export function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  switch (platform) {
    case "Instagram":
      return <Instagram className={className} />
    case "Facebook":
      return <Facebook className={className} />
    case "TikTok":
      return <Tiktok className={className} />
    case "LinkedIn":
      return <Linkedin className={className} />
    case "YouTube":
      return <Youtube className={className} />
    default:
      return <Instagram className={className} />
  }
}
