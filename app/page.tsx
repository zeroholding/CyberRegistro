'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ContainerTextFlip } from "./components/ContainerTextFlip";

// Animation wrapper component
function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [quantity, setQuantity] = useState(1);

  // Mesma tabela de precos do modal (por unidade)
  const pricingTiers = [
    { originalPrice: 49.9, price: 39.9 }, // 1-10
    { originalPrice: 49.9, price: 37.9 }, // 11-30
    { originalPrice: 49.9, price: 35.9 }, // 31-50
    { originalPrice: 49.9, price: 32.9 }, // 51-100
    { originalPrice: 49.9, price: 29.9 }, // 101+
  ];

  const tierBounds = [
    { min: 1, max: 10 },
    { min: 11, max: 30 },
    { min: 31, max: 50 },
    { min: 51, max: 100 },
    { min: 101, max: Infinity },
  ];

  const activeTierIndex = tierBounds.findIndex(
    (t) => quantity >= t.min && quantity <= t.max,
  );
  const unitPrice = pricingTiers[Math.max(0, activeTierIndex)].price;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Cyber Registro"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-gray-900 transition-colors">
                Início
              </a>
              <a href="#recursos" className="text-gray-700 hover:text-gray-900 transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-gray-700 hover:text-gray-900 transition-colors">
                Como Funciona
              </a>
              <a href="#precos" className="text-gray-700 hover:text-gray-900 transition-colors">
                Preços
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="bg-[#2C3E50] text-white px-6 py-2 rounded-lg hover:bg-[#1a252f] transition-colors"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="inicio" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Registro de Anúncios<br />
                com Proteção{" "}
                <ContainerTextFlip
                  words={["Garantida", "Confiável", "Legal", "Total"]}
                  interval={2500}
                  className="text-4xl md:text-5xl px-4 py-1 inline-block align-middle"
                />
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-lg text-gray-600 mb-8"
              >
                Garanta direitos autorais de imagens, vídeos e textos publicitários dos teus anúncios
                de forma <strong>simples</strong>, <strong>rápida</strong>, com <strong>custo baixo</strong>, <strong>suporte especializado em e-commerce</strong> e
                com <strong>cobertura internacional</strong>.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-wrap gap-4"
              >
                <a
                  href="#precos"
                  className="bg-[#2C3E50] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#1a252f] transition-colors hover:scale-105 transform"
                >
                  Registre seu anúncio agora
                </a>
                <a
                  href="#como-funciona"
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition-colors hover:scale-105 transform"
                >
                  Saiba mais
                </a>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="bg-gradient-to-br from-blue-200 to-blue-400 rounded-3xl p-8 shadow-xl"
              >
                <div className="bg-white rounded-2xl p-8 relative overflow-hidden">
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 400 300" className="w-full h-auto">
                      {/* Shield with Copyright */}
                      <defs>
                        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#1e3a8a', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      {/* Shopping cart */}
                      <g transform="translate(30, 40)">
                        <rect x="0" y="10" width="40" height="30" rx="4" fill="#60a5fa" opacity="0.6"/>
                        <circle cx="12" cy="50" r="4" fill="#3b82f6"/>
                        <circle cx="28" cy="50" r="4" fill="#3b82f6"/>
                      </g>
                      {/* Main Shield */}
                      <g transform="translate(140, 80)">
                        <path d="M60 0 L120 20 L120 70 Q120 100 60 120 Q0 100 0 70 L0 20 Z" fill="url(#shieldGradient)" stroke="#1e3a8a" strokeWidth="2"/>
                        <circle cx="60" cy="60" r="35" fill="white"/>
                        <circle cx="60" cy="60" r="30" fill="none" stroke="#1e3a8a" strokeWidth="3"/>
                        <text x="60" y="75" fontSize="40" fontWeight="bold" fill="#1e3a8a" textAnchor="middle">©</text>
                      </g>
                      {/* Lock */}
                      <g transform="translate(280, 120)">
                        <rect x="0" y="15" width="35" height="25" rx="4" fill="#fbbf24"/>
                        <path d="M8 15 L8 10 Q8 3 17.5 3 Q27 3 27 10 L27 15" fill="none" stroke="#fbbf24" strokeWidth="4"/>
                        <circle cx="17.5" cy="27" r="4" fill="#fff"/>
                      </g>
                      {/* Store */}
                      <g transform="translate(260, 40)">
                        <rect x="0" y="20" width="50" height="35" rx="4" fill="#60a5fa"/>
                        <rect x="5" y="30" width="20" height="15" rx="2" fill="#3b82f6"/>
                        <path d="M0 20 L25 10 L50 20" fill="#f59e0b"/>
                      </g>
                      {/* Document */}
                      <g transform="translate(50, 120)">
                        <rect x="0" y="0" width="40" height="50" rx="3" fill="white" stroke="#3b82f6" strokeWidth="2"/>
                        <line x1="8" y1="12" x2="32" y2="12" stroke="#93c5fd" strokeWidth="2"/>
                        <line x1="8" y1="20" x2="32" y2="20" stroke="#93c5fd" strokeWidth="2"/>
                        <line x1="8" y1="28" x2="25" y2="28" stroke="#93c5fd" strokeWidth="2"/>
                      </g>
                      {/* Image icon */}
                      <g transform="translate(310, 200)">
                        <rect x="0" y="0" width="35" height="30" rx="3" fill="white" stroke="#3b82f6" strokeWidth="2"/>
                        <circle cx="10" cy="10" r="4" fill="#fbbf24"/>
                        <path d="M0 25 L12 15 L20 20 L35 10 L35 30 L0 30 Z" fill="#93c5fd"/>
                      </g>
                      {/* Shopping cart 2 */}
                      <g transform="translate(330, 80)">
                        <rect x="0" y="5" width="25" height="20" rx="3" fill="#60a5fa" opacity="0.6"/>
                        <circle cx="8" cy="30" r="3" fill="#3b82f6"/>
                        <circle cx="17" cy="30" r="3" fill="#3b82f6"/>
                      </g>
                      {/* Light bulb */}
                      <g transform="translate(20, 200)">
                        <circle cx="15" cy="15" r="10" fill="#fbbf24" opacity="0.7"/>
                        <rect x="12" y="25" width="6" height="8" rx="1" fill="#d4d4d4"/>
                      </g>
                      {/* Decorative circles */}
                      <circle cx="320" cy="250" r="3" fill="#3b82f6" opacity="0.5"/>
                      <circle cx="100" cy="270" r="3" fill="#3b82f6" opacity="0.5"/>
                      <circle cx="50" cy="50" r="3" fill="#3b82f6" opacity="0.5"/>
                    </svg>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="recursos" className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Por que registrar seus anúncios?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Transforme seus anúncios em obras protegidas: registre-os em minutos e
                tenha defesa jurídica robusta contra plágio e uso indevido.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <AnimatedSection delay={0.1}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Defesa Jurídica Imbatível
              </h3>
              <p className="text-gray-600">
                Documente seus anúncios como <strong>obras intelectuais</strong> e
                receba respaldo legal para <strong>denunciar concorrentes</strong> desleais.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Card 2 */}
            <AnimatedSection delay={0.2}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Alcance Global
              </h3>
              <p className="text-gray-600">
                Registros válidos em diversos países, assegurando sua <strong>propriedade intelectual além-fronteiras</strong>.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Card 3 */}
            <AnimatedSection delay={0.3}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Processo 100% Online
              </h3>
              <p className="text-gray-600">
                Compre créditos, siga instruções por e-mail e
                registre cada anúncio diretamente na nossa plataforma.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Card 4 */}
            <AnimatedSection delay={0.4}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Comprovante de Titularidade
              </h3>
              <p className="text-gray-600">
                Receba <strong>certificado oficial de direito autoral</strong> e comprove
                formalmente a autoria do seu material.
              </p>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Como Funciona o Registro
              </h2>
              <p className="text-lg text-gray-600">
                Quatro passos simples para garantir a proteção legal dos seus anúncios
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <AnimatedSection delay={0.1}>
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-gray-400">01</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Comprar créditos no site
              </h3>
              <p className="text-gray-600">
                Adquira os créditos necessários para realizar seus registros de
                forma rápida e segura.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Step 2 */}
            <AnimatedSection delay={0.2}>
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-gray-400">02</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Receber instruções e link para Cadastro e login
              </h3>
              <p className="text-gray-600">
                Receba por e-mail todas as orientações e acesso direto à
                nossa plataforma de registro.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Step 3 */}
            <AnimatedSection delay={0.3}>
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-gray-400">03</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Preencher dados do anúncio e anexar arquivos
              </h3>
              <p className="text-gray-600">
                Insira as informações do seu anúncio, do autor e titular da obra e
                faça upload dos arquivos que deseja proteger.
              </p>
              </motion.div>
            </AnimatedSection>

            {/* Step 4 */}
            <AnimatedSection delay={0.4}>
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-gray-400">04</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Gerar e baixar comprovante de registro
              </h3>
              <p className="text-gray-600">
                Obtenha seu certificado oficial de registro autoral para uso legal
                imediato no programa de propriedade intelectual do devido marketplace.
              </p>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Preços de nossos serviços
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Dê uma olhada em nossos serviços prestados
              </p>
              <div className="inline-flex rounded-lg border border-gray-300 p-1">
                <button className="px-6 py-2 rounded-md bg-[#2C3E50] text-white font-medium">
                  Registro de anúncio
                </button>
                <button className="px-6 py-2 rounded-md text-gray-600 font-medium hover:bg-gray-100 transition-colors">
                  Registro de marca
                </button>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="max-w-md mx-auto">
              <motion.div
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  R$ {unitPrice.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {pricingTiers.map((tier, index) => {
                  const bounds = tierBounds[index];
                  const isActive = quantity >= bounds.min && quantity <= bounds.max;
                  const labelTo = bounds.max === Infinity ? 'mais' : bounds.max;
                  return (
                    <label
                      key={index}
                      onClick={() => setQuantity(bounds.min)}
                      className={`flex items-center justify-between px-3 py-3 rounded-md border-2 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#2F4F7F] border-[#2F4F7F] text-white'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="pricing-tier"
                          checked={isActive}
                          onChange={() => setQuantity(bounds.min)}
                          className="w-4 h-4 accent-[#2F4F7F] border-gray-300 focus:ring-[#2F4F7F]"
                          />
                        <span className={`ml-3 ${isActive ? 'text-white' : 'text-neutral-700'}`}>
                          Compre {bounds.min} - {labelTo} creditos
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tier.originalPrice !== tier.price && (
                          <span className={`line-through text-sm ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                            R$ {tier.originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                        <span className={`font-bold ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                          R$ {tier.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>

              <Link
                href={`/checkout?quantity=${quantity}`}
                className="block w-full bg-[#2C3E50] text-white text-center py-4 rounded-lg text-lg font-semibold hover:bg-[#1a252f] transition-colors"
              >
                Continuar
              </Link>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#2C3E50] px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold text-white mb-4"
            >
              Pronto para proteger seus anúncios?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-300 mb-8"
            >
              Não espere que alguém copie seu trabalho criativo.<br />
              Garanta sua proteção legal agora mesmo.
            </motion.p>
            <motion.a
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              href="#precos"
              className="inline-block bg-white text-[#2C3E50] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Registre seu anúncio agora
            </motion.a>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Logo and Description */}
            <div>
              <Image
                src="/logo.png"
                alt="Cyber Registro"
                width={150}
                height={50}
                className="h-10 w-auto mb-4"
              />
              <p className="text-gray-600">
                Protegendo a criatividade e a inovação no mundo digital.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Navegação</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#inicio" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Início
                  </a>
                </li>
                <li>
                  <a href="#como-funciona" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Como Funciona
                  </a>
                </li>
                <li>
                  <a href="#precos" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Preços
                  </a>
                </li>
                <li>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Siga-nos</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>© 2025 CyberRegistro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
