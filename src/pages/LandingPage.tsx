import { Link } from 'react-router-dom';
import { ArrowRight, Package, Receipt, MessageSquare, BarChart3, ScanLine } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

// Floating background icons for hero
const FloatingIcons = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Floating gradient orbs */}
    <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

    {/* Floating icons - hidden on mobile */}
    <div className="absolute top-32 right-[15%] text-white/10 animate-float hidden lg:block">
      <Package className="w-16 h-16" />
    </div>
    <div className="absolute bottom-32 left-[10%] text-white/10 animate-float-delayed hidden lg:block">
      <Receipt className="w-12 h-12" />
    </div>
    <div className="absolute top-1/2 right-[8%] text-white/10 animate-float-slow hidden lg:block">
      <MessageSquare className="w-14 h-14" />
    </div>
    <div className="absolute bottom-1/4 left-[20%] text-white/10 animate-float hidden lg:block" style={{ animationDelay: '3s' }}>
      <BarChart3 className="w-10 h-10" />
    </div>
  </div>
);

const features = [
  {
    icon: <ScanLine className="w-7 h-7" />,
    title: 'AI Receipt Scanning',
    description: 'Upload a photo. Get instant item verification. No manual counting.',
  },
  {
    icon: <MessageSquare className="w-7 h-7" />,
    title: 'Direct Communication',
    description: 'Restaurants and suppliers connected. Report discrepancies, resolve issues—all in one place.',
  },
  {
    icon: <BarChart3 className="w-7 h-7" />,
    title: 'Delivery Analytics',
    description: 'Suppliers see every restaurant. Track accuracy, spot patterns, improve operations.',
  },
];

export default function LandingPage() {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline">Sign up</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 border border-white/10">
                2 week free trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Animated */}
      <section className="relative min-h-[90vh] hero-gradient-animated overflow-hidden flex items-center">
        <FloatingIcons />

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 dot-pattern" />

        {/* Hero content */}
        <div className="relative container mx-auto px-4 py-20 lg:py-32 w-full">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-white leading-tight mb-6 animate-fade-in-up">
              <span className="block">The delivery verification layer</span>
              <span className="block text-white/90">your operations are missing.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up animation-delay-200">
              Stop counting boxes. Let AI handle delivery verification so you can focus on what matters.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                  Start today
                  <ArrowRight size={18} />
                </Button>
              </Link>

              <button
                onClick={scrollToFeatures}
                className="text-white/80 hover:text-white font-medium text-lg transition-colors"
              >
                See how it works
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 50L48 45.7C96 41.3 192 32.7 288 35.8C384 39 480 54 576 58.3C672 62.7 768 56.3 864 50C960 43.7 1056 37.3 1152 39.2C1248 41 1344 51 1392 56L1440 61V101H1392C1344 101 1248 101 1152 101C1056 101 960 101 864 101C768 101 672 101 576 101C480 101 384 101 288 101C192 101 96 101 48 101H0V50Z"
              fill="hsl(var(--background-secondary))"
            />
          </svg>
        </div>
      </section>

      {/* Features Section - 3 Cards Only */}
      <section className="py-20 px-4 bg-background-secondary" id="features">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Social Proof - Simple line */}
          <p className="text-center text-muted-foreground text-sm mt-16">
            Trusted by restaurants across Finland
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-primary rounded-2xl p-12 text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to simplify your deliveries?
            </h2>
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                Start today
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © 2025 DeliVeri. Made with 💙 in Finland.
          </p>
        </div>
      </footer>
    </div>
  );
}
