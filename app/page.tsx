import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { AdmissionForm } from "@/components/admission-form";

export default function LandingPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="min-h-screen bg-citsa-black text-white flex items-center justify-center relative overflow-hidden px-5 sm:px-8 pt-20 sm:pt-24 pb-12 sm:pb-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_40%,_hsla(0,75%,45%,0.15),_transparent_60%)] z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,20,20,0.15)] via-[rgba(20,20,20,0.3)] to-[rgba(20,20,20,0.75)] z-[1]" />
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] z-[2]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-[3] max-w-[900px] text-center">
          <div className="text-[0.75rem] font-semibold tracking-[0.15em] uppercase text-citsa-red-light mb-6">
            École Mystico Négro-Africaine
          </div>
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.1] mb-8 tracking-[-0.02em]">
            CITSA Occulte School International
            <em className="not-italic block mt-2 text-[0.7em] text-white/60 font-normal font-serif italic">
              La sagesse ancestrale au service de l'éveil spirituel
            </em>
          </h1>
          <p className="font-serif text-[1rem] sm:text-[1.25rem] italic text-white/70 max-w-[600px] mx-auto mb-10 sm:mb-12 leading-[1.7]">
            &ldquo;Celui qui cherche la lumière dans l&apos;obscurité trouvera le chemin vers la connaissance éternelle. La sagesse des ancêtres est un héritage qui transcende le temps.&rdquo;
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#admission">
              <Button variant="accent" size="lg">Demander une admission</Button>
            </a>
            <Link href="/connexion">
              <Button variant="ghost" size="lg">Espace membre</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Admission Section */}
      <section id="admission" className="py-12 sm:py-20 px-4 sm:px-8 bg-cream">
        <div className="text-center max-w-[600px] mx-auto mb-12">
          <div className="text-[0.7rem] font-bold tracking-[0.15em] uppercase text-citsa-red-hex mb-3">
            Rejoignez-nous
          </div>
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-[#141414] mb-3 tracking-[-0.01em]">
            Demande d&apos;Admission
          </h2>
          <p className="text-base text-muted-fg">
            Remplissez le formulaire ci-dessous pour soumettre votre candidature.
          </p>
        </div>

        <div className="max-w-[800px] mx-auto bg-white rounded-xl p-5 sm:p-8 lg:p-10 shadow-card border border-border">
          <AdmissionForm />
        </div>
      </section>

      <Footer />
    </>
  );
}

