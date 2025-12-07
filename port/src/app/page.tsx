import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-background overflow-x-hidden">
            <Header />
            <HeroSection />
            <FeaturesSection />
            <CTASection />
            <Footer />
        </main>
    )
}
