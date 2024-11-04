"use client";
import { useState, useEffect, useRef } from 'react'
import { motion, useAnimation, useTransform, useScroll, useSpring, useMotionValue, animate } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Instagram, Twitter, Facebook } from "lucide-react"
import Image from 'next/image'

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

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  user: {
    firstName: string;
    image: string;
  }
  images: {
    url: string;
    altText: string;
  }[];
}

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    // Appel API pour récupérer les produits
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await res.json();
        setProducts(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;


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
                <CountUp end={620} />+
              </div>
              <p>Active Users</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">
                <CountUp end={4530} />+
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
      {products.slice(0, 4).map((product) => (
        <Link key={product.id} href={`/article/${product.id}`}>
        <ProductCard
          image={product.images[0]?.url || '/placeholder.svg?height=200&width=300'}
          name={product.title}
          price={`${product.price}€`} // Assuming `price` is a number
        />
      </Link>
      ))}
    </div>
  </div>
</section>


      {/* Testimonials Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">La Communité parle de FlipIt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Le site est incroyable et me permet de vendre mes vieux articles de skate car je suis chauve et je n'ai plus l'âge"
              author="Benoit Beti, Retraité"
            />
            <TestimonialCard
              quote="FlipIt has completely transformed how I buy and sell gear. It's the best place for skaters!"
              author="Tony Hawk, Pro Skater"
            />
            <TestimonialCard
              quote="Les produits vérifiés par des pros me donnent confiance dans mes achats. Cette plateforme change la donne !"
              author="Fabien.C, Skater en devenir"
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">À propos des auteurs</h2>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="p-6 rounded-lg shadow-lg bg-white">
              <div className="w-36 h-36 mx-auto mb-4">
                <Image 
                  src="/uploads/Lucas.jpg" 
                  alt="Lucas Negre" 
                  width={150} 
                  height={150} 
                  className="rounded-full object-cover w-full h-full"
                />
              </div>
              <h3 className="text-xl font-semibold">Lucas NEGRE</h3>
              <p className="text-gray-700">Étudiant à Holberton School de Toulouse</p>
            </div>
            <div className="p-6 rounded-lg shadow-lg bg-white">
              <div className="w-36 h-36 mx-auto mb-4">
                <Image 
                  src="/uploads/Hadri.jpg" 
                  alt="Hadrien Tayac" 
                  width={150} 
                  height={150} 
                  className="rounded-full object-cover w-full h-full"
                />
              </div>
              <h3 className="text-xl font-semibold">Hadrien TAYAC</h3>
              <p className="text-gray-700">Étudiant à Holberton School de Toulouse</p>
            </div>
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
            <h2 className="text-3xl font-bold mb-6">Envie d&apos;être le premier avertie ? </h2>
            <p className="mb-8 text-lg">Inscrie toi à la Newsletter pour être le premier à voir notre sélection d&apos;articles</p>
            <form className="flex flex-col md:flex-row justify-center items-center gap-4 max-w-md mx-auto">
              <Input type="email" placeholder="Entre ton email" className="bg-white text-black" />
              <Button variant="secondary" size="lg">
                Sign Up
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  )
}