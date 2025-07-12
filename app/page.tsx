import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Upload, Sparkles, BookMarked, Network, Search } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      {/* Header */}
      <header className="border-b shadow-sm bg-white">
        <div className="container flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-royal-500 p-1.5 rounded-lg flex items-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-sans font-bold text-royal-500">Eureka</span>
          </Link>
          <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
            <Link href="/reader" className="font-sans font-medium text-royal-500 hover:text-royal-600">Reader</Link>
            <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
            <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
            <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-royal-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 paper-texture opacity-10"></div>
        <div className="container px-4 md:px-6 relative z-10">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur-md mb-4 w-fit">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                <span>Revolutionizing academic research</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Cursor for <span className="italic">Research</span> Papers
                </h1>
                <p className="max-w-[600px] text-white/80 md:text-xl">
                  Eureka helps you read, understand, and connect research papers with AI-powered insights and an
                  intelligent memory system designed for academic professionals.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row mt-4">
                <Link href="/reader">
                  <Button
                    size="lg"
                    className="bg-white text-royal-500 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
                  >
                    Get Started <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 hover:text-white backdrop-blur-sm bg-white/10"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mx-auto lg:ml-auto flex justify-center">
              <div className="relative w-full max-w-[500px] aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-sm">
                <div className="absolute inset-0 bg-royal-400/20"></div>
                <img
                  src="/placeholder.svg?height=500&width=800"
                  alt="PaperMind interface preview"
                  className="object-cover w-full h-full mix-blend-overlay"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg border border-white/20 shadow-xl w-4/5">
                    <div className="h-4 w-4/5 bg-white/30 rounded mb-3"></div>
                    <div className="h-3 w-3/5 bg-white/30 rounded mb-6"></div>
                    <div className="flex gap-3 mb-4">
                      <div className="h-8 w-8 rounded-full bg-royal-300/50"></div>
                      <div className="flex-1">
                        <div className="h-2 bg-white/30 rounded mb-2"></div>
                        <div className="h-2 w-4/5 bg-white/30 rounded"></div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-royal-400/50"></div>
                      <div className="flex-1">
                        <div className="h-2 bg-white/30 rounded mb-2"></div>
                        <div className="h-2 w-3/5 bg-white/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-ivory to-transparent"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-ivory">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-2 text-royal-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-royal-500">
                Powerful Features for <span className="italic">Researchers</span>
              </h2>
              <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Everything you need to enhance your research workflow and connect ideas across papers.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12 mt-12">
            {/* Feature 1 */}
            <div className="flex flex-col items-center space-y-4 text-center rounded-xl p-6 border bg-white shadow-elegant">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-500 shadow-md">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-royal-500">Seamless Upload</h3>
                <p className="text-gray-600">
                  Upload PDFs directly or use our browser extension to capture papers from the web with automatic
                  metadata extraction.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link
                  href="/reader"
                  className="text-royal-500 hover:text-royal-600 text-sm font-medium flex items-center"
                >
                  Try it now <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="flex flex-col items-center space-y-4 text-center rounded-xl p-6 border bg-white shadow-elegant">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-500 shadow-md">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-royal-500">Smart Discovery</h3>
                <p className="text-gray-600">
                  Transform research questions into comprehensive paper discovery with AI-powered search and relevance
                  ranking.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link
                  href="/search"
                  className="text-royal-500 hover:text-royal-600 text-sm font-medium flex items-center"
                >
                  Discover papers <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="flex flex-col items-center space-y-4 text-center rounded-xl p-6 border bg-white shadow-elegant">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-500 shadow-md">
                <BookMarked className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-royal-500">Enhanced Reading</h3>
                <p className="text-gray-600">
                  Clean, sophisticated view with AI-powered highlighting and explanations of complex concepts tailored
                  for academic research.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link
                  href="/reader"
                  className="text-royal-500 hover:text-royal-600 text-sm font-medium flex items-center"
                >
                  Explore reader <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
            {/* Feature 4 */}
            <div className="flex flex-col items-center space-y-4 text-center rounded-xl p-6 border bg-white shadow-elegant">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-500 shadow-md">
                <Network className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-royal-500">Knowledge Graph</h3>
                <p className="text-gray-600">
                  Visualize connections between ideas and quotes across all your research papers with advanced semantic
                  linking.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link
                  href="/memory"
                  className="text-royal-500 hover:text-royal-600 text-sm font-medium flex items-center"
                >
                  View graph <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-2 text-royal-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-royal-500">
                Trusted by Academic Professionals
              </h2>
              <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                See what researchers are saying about Eureka
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="rounded-xl border bg-ivory p-6 shadow-elegant">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-royal-500 flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div>
                  <h4 className="font-medium">Dr. Jane Doe</h4>
                  <p className="text-sm text-gray-500">Professor of Computer Science, MIT</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Eureka has transformed how I approach literature reviews. The knowledge graph feature helps me
                discover connections I would have otherwise missed."
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-xl border bg-ivory p-6 shadow-elegant">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-royal-500 flex items-center justify-center text-white font-bold">
                  RS
                </div>
                <div>
                  <h4 className="font-medium">Dr. Robert Smith</h4>
                  <p className="text-sm text-gray-500">Research Director, Stanford AI Lab</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "The AI-powered explanations have been invaluable for quickly understanding complex concepts across
                interdisciplinary research papers."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-xl border bg-ivory p-6 shadow-elegant">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-royal-500 flex items-center justify-center text-white font-bold">
                  AK
                </div>
                <div>
                  <h4 className="font-medium">Dr. Amelia Khan</h4>
                  <p className="text-sm text-gray-500">Neuroscience Researcher, Harvard</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Eureka's memory system has become an essential part of my research workflow. It's like having a
                second brain for academic literature."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-royal-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 paper-texture opacity-10"></div>
        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Ready to Transform Your Research?
              </h2>
              <p className="max-w-[600px] mx-auto text-white/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join thousands of researchers who are using Eureka to enhance their understanding and connections.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-[400px]:flex-row">
              <Link href="/reader">
                <Button
                  size="lg"
                  className="bg-white text-royal-500 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm"
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-ivory to-transparent"></div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-ivory">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-royal-500 p-1.5 rounded-lg">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-royal-500">Eureka</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Transform your research experience with AI-powered insights and an intelligent memory system.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-royal-400 hover:text-royal-500">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-royal-400 hover:text-royal-500">
                  <span className="sr-only">GitHub</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a href="#" className="text-royal-400 hover:text-royal-500">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-royal-500">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-royal-500">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    API Status
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-royal-500">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-royal-500 transition-colors">
                    Press
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">© 2024 Eureka. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="#" className="text-sm text-gray-600 hover:text-royal-500 transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-gray-600 hover:text-royal-500 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-gray-600 hover:text-royal-500 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
