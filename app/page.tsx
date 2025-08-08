import Navbar from "@/components/Navbar";
import dynamic from 'next/dynamic';

const WalletGenerator = dynamic(
  () => import('@/components/WalletGenerator'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 p-4 min-h-[92vh]">
      <Navbar/>
      <WalletGenerator />
    </main>
  );
}