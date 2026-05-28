"use client";
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, ArrowLeft, ShieldCheck, Tag, Ruler, Layers } from 'lucide-react';
import { OfferDialog } from '@/components/chat/offer-dialog';
import ReportButton from '@/components/ReportButton';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ArticlePageProps {
  params: { id: string };
}

interface Article {
  id: number;
  title: string;
  price: number;
  description: string;
  images: { url: string; altText: string | null }[];
  condition: string;
  size: string;
  brand?: string;
  userId: number;
  user?: User;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  image: string;
  bio?: string;
  createdAt?: string;
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  Neuf:         { label: 'Neuf',         color: 'bg-card border border-border text-foreground/80' },
  Comme_neuf:   { label: 'Comme neuf',   color: 'bg-card border border-border text-foreground/80' },
  Bon_etat:     { label: 'Bon état',     color: 'bg-card border border-border text-foreground/80' },
  Moyen_etat:   { label: 'Moyen état',   color: 'bg-card border border-border text-foreground/80' },
  Mauvais_etat: { label: 'Mauvais état', color: 'bg-card border border-border text-foreground/80' },
}

const ArticlePage: React.FC<ArticlePageProps> = ({ params }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/article/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        setArticle(data);
        if (data?.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Vérifie si l'article est déjà liké
  useEffect(() => {
    if (!session || !params.id) return;
    fetch(`/api/likes/${params.id}`)
      .then(r => r.ok ? r.json() : { liked: false })
      .then(d => setIsLiked(d.liked));
  }, [session, params.id]);

  const handleLike = async () => {
    if (!session) { router.push(`/login?callbackUrl=/article/${params.id}`); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: article?.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setIsLiked(d.liked);
    }
    setLikeLoading(false);
  };

  const handleBuy = () => {
    if (session) {
      router.push(`/payment?amount=${article?.price}&currency=EUR&productId=${article?.id}`);
    } else {
      router.push(`/login?callbackUrl=/article/${article?.id}`);
    }
  };

  const handleContact = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/article/${article?.id}`);
      return;
    }
    if (!article) return;
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: article.id, sellerId: article.userId }),
    });
    if (res.ok) {
      const conv = await res.json();
      router.push(`/inbox?c=${conv.id}&p=${article.id}`);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded-lg animate-pulse w-3/4" />
            <div className="h-10 bg-muted rounded-lg animate-pulse w-1/3" />
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) return notFound();

  const cond = conditionConfig[article.condition] ?? { label: article.condition, color: 'bg-muted text-muted-foreground' };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

        {/* ─── Colonne gauche : images ─── */}
        <div className="space-y-3">
          {/* Image principale */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted cursor-zoom-in group">
                {article.images[selectedImage] ? (
                  <Image
                    src={article.images[selectedImage].url}
                    alt={article.images[selectedImage].altText || article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Aucune image
                  </div>
                )}
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              {article.images[selectedImage] && (
                <Image
                  src={article.images[selectedImage].url}
                  alt={article.title}
                  width={900}
                  height={900}
                  className="object-contain w-full h-full max-h-[80vh]"
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Thumbnails */}
          {article.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {article.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors duration-150 cursor-pointer ${
                    i === selectedImage ? 'border-foreground' : 'border-transparent hover:border-border'
                  }`}
                >
                  <Image src={img.url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Colonne droite : infos ─── */}
        <div className="flex flex-col gap-6">

          {/* Titre + prix */}
          <div>
            <span className={`inline-block mb-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cond.color}`}>
              {cond.label}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight mb-3">
              {article.title}
            </h1>
            <p className="font-mono text-4xl font-bold tabular-nums">
              {Number(article.price).toFixed(0)} <span className="text-2xl">€</span>
            </p>
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isLiked
                  ? 'border-red-300 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-800'
                  : 'border-border hover:border-red-300 hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Favori' : 'Ajouter aux favoris'}
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors duration-150 cursor-pointer">
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Détails */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Détails</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">État</span>
                <span className="font-medium ml-auto">{cond.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Taille</span>
                <span className="font-medium ml-auto">{article.size}</span>
              </div>
              {article.brand && (
                <div className="flex items-center gap-2 col-span-2">
                  <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Marque</span>
                  <span className="font-medium ml-auto">{article.brand}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {article.description && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Description</h2>
              <p className="text-sm leading-relaxed text-foreground/80">{article.description}</p>
            </div>
          )}

          {/* Vendeur */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Vendeur</h2>
            <a href={`/profile/${article.userId}`} className="flex items-start gap-3 mb-4 hover:opacity-80 transition-opacity duration-150 cursor-pointer">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={user?.image} />
                <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold underline-offset-2 hover:underline">
                  {user ? `${user.firstName} ${user.lastName}`.trim() || 'Vendeur FlipIt' : '—'}
                </p>
                {user?.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                )}
                {user?.bio && (
                  <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{user.bio}</p>
                )}
              </div>
            </a>
            <button
              onClick={handleContact}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter le vendeur
            </button>
          </div>

          {/* CTAs principaux */}
          <div className="space-y-3">
            <button
              onClick={handleBuy}
              className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide hover:opacity-90 transition-opacity duration-150 cursor-pointer"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              Acheter maintenant — {Number(article.price).toFixed(0)} €
            </button>
            <OfferDialog
              productId={article.id}
              onOfferSubmit={(offer) => console.log('Offre soumise:', offer)}
            />
          </div>

          {/* Sécurité */}
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Effectue toujours tes échanges via la plateforme FlipIt pour être protégé. Ne communique jamais tes coordonnées bancaires.</p>
          </div>

          {/* Signaler l'annonce — masqué si c'est la sienne */}
          {String(session?.user?.id) !== String(article.userId) && (
            <div className="flex justify-end">
              <ReportButton productId={article.id} label="Signaler cette annonce" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
