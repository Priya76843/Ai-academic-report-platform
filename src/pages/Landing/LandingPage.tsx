import Navbar from '../../components/landing/Navbar'
import Hero from '../../components/landing/Hero'
import Features from '../../components/landing/Features'
import HowItWorks from '../../components/landing/HowItWorks'
import WorkspacePreview from '../../components/landing/WorkspacePreview'
import CTA from '../../components/landing/CTA'
import Footer from '../../components/landing/Footer'
function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <WorkspacePreview />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
export default LandingPage