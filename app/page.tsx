import { HeroSection } from "@/app/_components/hero-section";
import { FeaturesSection } from "@/app/_components/features-section";
import CheckoutForm from "@/app/_components/checkout-form";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />

      {/* Pricing / checkout — temporary placement until the full pricing section is designed */}
      <section id="pricing" className="bg-white py-24 px-6 md:px-[80px]">
        <div className="max-w-[480px] mx-auto text-center">
          <h2 className="font-dm-sans text-3xl font-bold text-[#1b1c1c] mb-2">
            Get your team certified
          </h2>
          <p className="font-dm-sans text-base text-[#544439] mb-10">
            One annual fee. All staff certified. Certificates ready in under an hour.
          </p>
          <CheckoutForm />
        </div>
      </section>
    </main>
  );
}
