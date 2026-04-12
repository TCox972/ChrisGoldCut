import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CompteNav from '@/components/public/CompteNav';

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <Navbar dark />
      <div className="relative">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80)' }} />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(20,16,10,0.65)' }} />
        </div>
        <div className="min-h-screen pt-24 pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
