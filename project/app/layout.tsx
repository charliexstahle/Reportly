import './globals.css'
import type { Metadata, ReactNode } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/AuthContext'
import { ConditionalHeader } from "@/components/ConditionalHeader"
import { PageWrapper } from "@/components/PageWrapper"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Banner Tool Prototype',
  description: 'Streamline your Banner workflows with script management and report design',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-background">
              <ConditionalHeader />
              <PageWrapper>
                {children}
              </PageWrapper>
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}