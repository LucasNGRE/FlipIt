"use client";
import { useState, useEffect, useRef } from 'react'
import { motion, useAnimation, useTransform, useScroll, useSpring, useMotionValue, animate } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Instagram, Twitter, Facebook } from "lucide-react"

interface ParallaxVideoProps {
  videoSrc: string;
}



const ParallaxVideo = ({ videoSrc }: ParallaxVideoProps) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, -150])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = 0.75 // Ralentit la vidéo pour un effet plus doux
    }
  }, [])

  return (
    <motion.div
      style={{ y }}
      className="absolute inset-0 w-full h-full"
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setIsVideoLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-1000 ${
          isVideoLoaded ? 'opacity-50' : 'opacity-0'
        }`}
      >
        <source src={videoSrc} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </motion.div>
  )
}


import { ReactNode } from 'react';
import Link from 'next/link';

const AnimatedText = ({ children, delay = 0 }: { children: ReactNode, delay?: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay }}
    className="inline-block"
  >
    {children}
  </motion.span>
)

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  const controls = useAnimation()
  const [ref, inView] = useInView()

  useEffect(() => {
    if (inView) {
      controls.start('visible')
    }
  }, [controls, inView])

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      variants={{
        visible: { opacity: 1, y: 0, rotate: 0 },
        hidden: { opacity: 0, y: 50, rotate: -5 }
      }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <Card className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <motion.div
            className="mb-4 text-4xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            {icon}
          </motion.div>
          <h3 className="mb-2 text-lg font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface ProductCardProps {
  image: string;
  name: string;
  price: string;
}

const ProductCard = ({ image, name, price }: ProductCardProps) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className="transform-gpu"
    >
      <Card className="overflow-hidden">
        <img src={image} alt={name} className="w-full h-48 object-cover" />
        <CardContent className="p-4">
          <h3 className="font-bold">{name}</h3>
          <p className="text-muted-foreground">{price}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface TestimonialCardProps {
  quote: string;
  author: string;
}

const TestimonialCard = ({ quote, author }: TestimonialCardProps) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -50 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="h-full">
        <CardContent className="flex flex-col justify-between p-6 h-full">
          <p className="italic mb-4">&quot;{quote}&quot;</p>
          <p className="text-right font-bold">- {author}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface CountUpProps {
  end: number;
  duration?: number;
}

const CountUp = ({ end, duration = 2 }: CountUpProps) => {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.7 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (inView) {
      count.set(0)
      animate(count, end, {
        duration: duration,
        ease: "easeOut",
      })
    }
  }, [count, end, duration, inView])

  return <motion.span ref={nodeRef}>{rounded}</motion.span>
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <ParallaxVideo videoSrc="/videos/skaters-montage.mp4" />
        <div className="relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-white drop-shadow-lg">
            <AnimatedText>Skate</AnimatedText>{' '}
            <AnimatedText delay={0.2}>Vends</AnimatedText>{' '}
            <AnimatedText delay={0.4}>et Achète</AnimatedText>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl md:text-2xl mb-8 text-white drop-shadow-md"
          >
            La deuxième vie arrive dans l&apos;univers du skate
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Link href={'/'}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                Découvrir
            </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Pourquoi choisir FlipIt ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🛹"
              title="Plateforme Collaborative"
              description="Vendez et achetez facilement : FlipIt offre une plateforme intuitive où chacun peut déposer ses articles ou acheter des produits de seconde main à bon prix."
            />
            <FeatureCard
              icon="🤝"
              title="Économie circulaire"
              description="Contribuez à un avenir durable : En achetant et en vendant des équipements de seconde main, vous participez à la réduction des déchets et à la promotion d'un mode de consommation plus responsable."
            />
            <FeatureCard
              icon="🌟"
              title="Sécurité des transactions"
              description="Achats en toute confiance : Profitez d'un environnement sécurisé pour vos transactions, avec des systèmes de paiement fiables et des options de protection des acheteurs pour garantir une expérience sans souci."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">
                <CountUp end={10000} />+
              </div>
              <p>Active Users</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">
                <CountUp end={5000} />+
              </div>
              <p>Products Listed</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">
                <CountUp end={98} />%
              </div>
              <p>Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ProductCard image="/placeholder.svg?height=200&width=300" name="Pro Deck X1" price="$89.99" />
            <ProductCard image="/placeholder.svg?height=200&width=300" name="Ultra Wheels" price="$49.99" />
            <ProductCard image="/placeholder.svg?height=200&width=300" name="Safety Gear Set" price="$129.99" />
            <ProductCard image="/placeholder.svg?height=200&width=300" name="Street Wear Hoodie" price="$59.99" />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Community Says</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="This marketplace has completely transformed how I shop for skating gear. The community aspect is unreal!"
              author="Alex, Pro Skater"
            />
            <TestimonialCard
              quote="I've discovered so many unique products and made great connections. It's more than just a marketplace."
              author="Sam, Skate Enthusiast"
            />
            <TestimonialCard
              quote="The pro-verified products give me confidence in my purchases. This platform is a game-changer!"
              author="Jordan, Aspiring Skater"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Ready to Join the Ultimate Skater&apos;s Marketplace?</h2>
            <p className="mb-8 text-lg">Sign up now and get exclusive access to deals, community events, and more!</p>
            <form className="flex flex-col md:flex-row justify-center items-center gap-4 max-w-md mx-auto">
              <Input type="email" placeholder="Enter your email" className="bg-white text-black" />
              <Button variant="secondary" size="lg">
                Sign Up
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">About Us</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:underline">Our Story</a></li>
                <li><a href="#" className="hover:underline">Team</a></li>
                <li><a href="#" className="hover:underline">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:underline">FAQ</a></li>
                <li><a href="#" className="hover:underline">Contact Us</a></li>
                <li><a href="#" className="hover:underline">Shipping</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:underline">Terms of Service</a></li>
                <li><a href="#" className="hover:underline">Privacy Policy</a></li>
                <li><a href="#" className="hover:underline">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground  hover:text-primary transition-colors duration-200">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                  <Facebook className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-muted-foreground">
            <p>&copy; 2024 FlipIt Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}